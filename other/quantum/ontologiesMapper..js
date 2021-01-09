var fs = require('fs');
const async = require('async');
var httpProxy = require('../../bin/httpProxy.')
var util = require('../../bin/skosConverters/util.')
var distinctTags = {};


var ontologiesMapper = {


    loadCsvFile: function (file, sep) {


        var str = "" + fs.readFileSync(file);
        var lines = str.split("\n")

        var headers = lines[0].trim().split(sep)


        var jsonArray = []
        lines.forEach(function (line) {
            var values = line.trim().split(sep)
            if (values.length > headers.length)
                return "error"
            var obj = {}
            values.forEach(function (value, index) {
                obj[headers[index]] = value
            })
            jsonArray.push(obj)


        })
        return {headers: headers, data: jsonArray}

    },


    mapClasses: function (sourceConfig, targetConfig, callback) {
        function decapitalize(str) {
            var str2 = "";
            for (var i = 0; i < str.length; i++) {
                var code = str.charCodeAt(i)
                var char = str.charAt(i)
                if (code > 64 && code < 91)
                    str2 += " " + String.fromCharCode(code + 32)
                else
                    str2 += char;
            }

            return str2.trim();
        }

        // var x=  decapitalize("FibreOpticPatchPanelsCabinet")


        var sourceClasses = {}
        async.series([


            //************************************* query sparql source*************************
            function (callbackSeries) {
                var query = sourceConfig.query;
                var body = {
                    url: sourceConfig.sparql_url,
                    params: {query: query},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"

                    }
                }
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    result.results.bindings.forEach(function (item) {
                        var id = item.concept.value
                        var label = item.label.value.toLowerCase();  //id.substring(id.indexOf("#") + 1)
                        if (sourceConfig.labelProcessor)
                            label = sourceConfig.labelProcessor(label)
                        sourceClasses[label] = {sourceId: id, targetIds: [], targetLabels: []}
                    })
                    callbackSeries()
                })


            },
            //************************************* slice labels and get same labels in target*************************
            function (callbackSeries) {
                var quantumLabels = Object.keys(sourceClasses);
                var slices = util.sliceArray(quantumLabels, 100);
                async.eachSeries(slices, function (labels, callbackEach) {
                    var fitlerStr = ""
                    labels.forEach(function (label, index) {
                        if (label.indexOf("\\") > -1)
                            var x = "3"
                        if (index > 0)
                            fitlerStr += "|"
                        fitlerStr += "^" + label.replace(/\\/g, "") + "$"
                    })
                    var fromStr = ""
                    if (targetConfig.graphUri)
                        fromStr = " from <" + targetConfig.graphUri + "> "
                    var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct *  " +
                        fromStr + "where { " +
                        "?concept rdfs:label ?conceptLabel.  filter ( regex(?conceptLabel, '" + fitlerStr + "','i'))}LIMIT 10000";


                    if (targetConfig.method == "POST") {

                        var params = {query: query};
                        var headers = {
                            "Accept": "application/sparql-results+json",
                            "Content-Type": "application/x-www-form-urlencoded"

                        }


                        httpProxy.post(targetConfig.sparql_url + "?output=json&format=json&query=", headers, params, function (err, data) {
                            if (err)
                                return callbackEach(err)
                            if (typeof data === "string")
                                data = JSON.parse(data.trim())
                            else if (data.result && typeof data.result != "object")//cas GEMET
                                data = JSON.parse(data.result.trim())

                            data.results.bindings.forEach(function (item) {
                                var x = item;
                                var id = item.concept.value;
                                var label = item.conceptLabel.value.toLowerCase();
                                if (!sourceClasses[label])
                                    return console.log(label)

                                sourceClasses[label].targetIds.push(id);
                                sourceClasses[label].targetLabels.push(item.conceptLabel.value);
                            })

                            callbackEach()

                        })


                    } else if (targetConfig.method == "GET") {
                        var query2 = encodeURIComponent(query);
                        query2 = query2.replace(/%2B/g, "+").trim()

                        var body = {
                            url: targetConfig.sparql_url + "?output=json&format=json&query=" + query2,
                            params: {query: query},
                            headers: {
                                "Accept": "application/sparql-results+json",
                                "Content-Type": "application/x-www-form-urlencoded"

                            }
                        }
                        httpProxy.get(body.url, body, function (err, data) {
                            if (typeof data === "string")
                                data = JSON.parse(data.trim())
                            else if (data.result && typeof data.result != "object")//cas GEMET
                                data = JSON.parse(data.result.trim())

                            data.results.bindings.forEach(function (item) {
                                var x = item;
                                var id = item.concept.value;
                                var label = item.conceptLabel.value.toLowerCase();
                                if (!sourceClasses[label])
                                    return console.log(label)

                                sourceClasses[label].targetIds.push(id);
                                sourceClasses[label].targetLabels.push(item.conceptLabel.value);
                            })

                            callbackEach()

                        })
                    }


                }, function (err) {

                    var x = sourceClasses;
                    callbackSeries(err)
                })

            },

            function (callbackSeries) {
                callbackSeries()
            },


        ], function (err) {

            callback(err, sourceClasses);
            //   console.log(JSON.stringify(sourceClasses, null, 2))
        })


    }
    , writeMappings: function (json, filePath) {

        //    var json = JSON.parse(fs.readFileSync(filePath));
        var triples = ""
        var str = ""
        for (var key in json) {
            var item = json[key]
            item.targetIds.forEach(function (targetId, index) {
                triples += "<" + item.sourceId + "> <http://www.w3.org/2002/07/owl#sameAs> <" + targetId + ">.\n"
                str += item.sourceId + key + "\t" + targetId + "\t" + item.targetLabels[index] + "\n"
            })


        }
        var x = str
        fs.writeFileSync(filePath.replace(".json", "nt"), triples)

    }
    , extractlabelsFromJsonData: function (filePath) {

        var json = JSON.parse(fs.readFileSync(filePath));
        var str = ""
        for (var table in json) {

            json[table].forEach(function (item) {
                for (var key in item) {
                    if (key.toLowerCase().indexOf("name") > -1) {
                        str += table + "\t" + key + "\t" + item[key] + "\n"
                    }
                }

            })
        }
        fs.writeFileSync(filePath.replace(".json", "Labels.txt"), str)


    }

    , extractMappingsFromMDM: function () {
        var totalFields = [
            "FunctionalClassID",
            "PhysicalClassID",
            "AttributeID",
            "AttributePickListValueID",
            "AttributeID2",
            "AttributePickListValueID2",
            "PickListValueGroupingID",
            "UnitOfMeasureID",
            "UnitOfMeasureDimensionID",
            "DisciplineID",
            "DocumentTypeID",
            "DisciplineDocumentTypeID",
            "FunctionalClassToPhysicalClassID",
            "FunctionalClassToAttributeID",
            "PhysicalClassToAttributeID",
            "FunctionalClassToDisciplineDocumentTypeID",
            "PhysicalClassToDisciplineDocumentTypeID"
        ]

        var json = JSON.parse(fs.readFileSync(filePath))
        var data = json["tblMappingSource"];

        var triples = "";
        data.forEach(function (item) {
            var sourceCode = item["SourceCode"]
            if (sourceCode && sourceCode.indexOf("CFIHOS") < 0)
                return
            totalFields.forEach(function (field) {

                if (item[field] && item[field] != "") {
                    var cfhosArrray = sourceCode.split("|")
                    cfhosArrray.forEach(function (code, indexCode) {
                        code = code.replace("CFIHOS-", "")
                        triples += "<http://data.total.com/resource/quantum/" + item[field] + ">  <http://data.total.com/resource/quantum/mappings#mappingSourceCode" + (indexCode + 1) + "> <http://data.15926.org/cfihos/" + code + ">.\n"
                    })
                }


            })
        })

        fs.writeFileSync(filePath.replace(".json", "mappingCFIHOS.nt"), triples)

    }
    ,

    generateMDMtablesMappings: function (filePath) {
        var json = ontologiesMapper.loadCsvFile(filePath,"\t")


        var sources=json.headers.slice(2)
        var triples=""
        var sourcesMap=""
        triples+=" <http://data.total.com/resource/quantum/model/table/> <http://www.w3.org/2000/01/rdf-schema#label> 'TABLE'.\n"
        triples+=" <http://data.total.com/resource/quantum/model/table/> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.total.com/resource/quantum/model/>.\n"

        json.data.forEach(function(item){
            if(item.type!="mainObj")
                return;
            triples+="  <http://data.total.com/resource/quantum/model/table/"+item["QuantumTable"]+"> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.total.com/resource/quantum/model/table/> .\n"

            triples+="  <http://data.total.com/resource/quantum/model/table/"+item["QuantumTable"]+"> <http://www.w3.org/2000/01/rdf-schema#label> '"+item["QuantumTable"]+"'.\n"


            sources.forEach(function(source){
                if(item[source] && item[source]!=""){

                    triples+="<"+item[source]+"> <http://www.w3.org/2000/01/rdf-schema#subClassOf>  <http://data.total.com/resource/quantum/model/table/"+item["QuantumTable"]+">.\n"
                    triples+="<http://data.total.com/resource/quantum/model/table/"+item["QuantumTable"]+"> <http://data.total.com/resource/quantum/model/mapping#"+source+"> <"+item[source]+">.\n"
                    sourcesMap+="'"+item[source]+"': '"+source+"',\n"

            }

            })
        })
        console.log(sourcesMap)


    }


}


var sourceConfig = {
    query: "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct * " +
        " from <http://data.total.com/quantum/vocab/>" +
        " where { ?concept rdfs:label ?label." +
        //  "?concept <http://www.w3.org/2000/01/rdf-schema#subClassOf> <http://data.15926.org/dm/Property>" +
        " }LIMIT 10000",
    sparql_url: "http://51.178.139.80:8890/sparql",
    labelProcessor: null,
    filePath: "D:\\NLP\\ontologies\\quantum\\mappingQuantum_Part4.nt"
}


var targetConfig = {

    // sparql_url: "http://staging.data.posccaesar.org/rdl/",
    sparql_url: "http://data.15926.org/cfihos",
    // graphUri: "http://standards.iso.org/iso/15926/part4/",
    //sparql_url: "http://51.178.139.80:8890/sparql",
    labelProcessor: null,
    method: "GET"
}

if (false) {
    module.exports = mapQuatumCfihos;


    ontologiesMapper.mapClasses(sourceConfig, targetConfig, function (err, sourceClasses) {
        if (err)
            return console.log(err);
        ontologiesMapper.writeMappings(sourceClasses, sourceConfig.filePath)
    });

}
if (false) {
    var filePath = "D:\\NLP\\ontologies\\quantum\\mappingPart4_PCS.json";
    ontologiesMapper.writeMappings(filePath)
}

if (false) {
    var filePath = "D:\\NLP\\ontologies\\quantum\\MDM Rev 4 SQL export_03122020.json";
    var filePath = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS RDL\\Reference Data Library\\CFIHOS - Reference Data Library V1.4.json";


    ontologiesMapper.extractlabelsFromJsonData(filePath)
}


if (false) {

    var filePath = "D:\\NLP\\ontologies\\quantum\\MDM Rev 4 SQL export_03122020.json"
    ontologiesMapper.extractMappingsFromMDM()


}


if (true) {

    var filePath = "D:\\NLP\\ontologies\\quantum\\mappings\\MDMablesMapping.txt"
    ontologiesMapper.generateMDMtablesMappings(filePath)


}


//mapQuatumCfihos.writeMappings()
