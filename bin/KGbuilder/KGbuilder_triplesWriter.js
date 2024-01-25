const ConfigManager = require("../configManager.");
const httpProxy = require("../httpProxy.");
const async = require("async");
const util = require("../util.");
const KGbuilder_socket = require("./KGbuilder_socket");


const KGbuilder_triplesWriter = {
    sparqlPrefixes: {
        xs: "<http://www.w3.org/2001/XMLSchema#>",
        rdf: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
        rdfs: "<http://www.w3.org/2000/01/rdf-schema#>",
        owl: "<http://www.w3.org/2002/07/owl#>",
        skos: "<http://www.w3.org/2004/02/skos/core#>",
        iso14224: "<http://data.total.com/resource/tsf/iso_14224#>",
        req: "<https://w3id.org/requirement-ontology/rdl/>",
        part14: "<http://rds.posccaesar.org/ontology/lis14/rdl/>",
        iso81346: "<http://data.total.com/resource/tsf/IEC_ISO_81346/>",
        slsv: "<http://souslesens.org/resource/vocabulary/>",
        dcterms: "<http://purl.org/dc/terms/>",
    },


    /**
     * Write <triples> in <graphUri> at <sparqlServerUrl>
     *
     * @param {Array} triples - array of {s: ,p: ,o: }
     * @param {string} graphUri - URI to name the graph that will be written
     * @param {string} sparqlServerUrl - URL of the sparql endpoint where to write the graph
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    writeTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        var insertTriplesStr = "";
        var totalTriples = 0;
        triples.forEach(function (triple) {
            var str = triple.s + " " + triple.p + " " + triple.o + ". ";
            insertTriplesStr += str;
        });

        var queryGraph = KGbuilder_triplesWriter.getSparqlPrefixesStr();

        queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";

        var params = { query: queryGraph };

        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
            if (err) {
                var x = queryGraph;
                return callback(err);
            }
            totalTriples += triples.length;
            return callback(null, totalTriples);
        });
    },

    /**
     * Delete graph named <graphUri> from sparql endpoint at <sparqlServerUrl>
     *
     * @param {string} graphUri - URI of the graph to delete
     * @param {string} sparqlServerUrl - URL of the sparql endpoint
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    clearGraph: function (graphUri, sparqlServerUrl, callback) {
        async.series(
            [
                function (callbackSeries) {
                    if (sparqlServerUrl) {
                        return callbackSeries();
                    }
                    ConfigManager.getGeneralConfig(function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sparqlServerUrl = result.sparql_server.url;
                        callbackSeries();
                    });
                },
                function (_callbackSeries) {
                    var query = "clear graph   <" + graphUri + ">";
                    var params = { query: query };

                    if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                        params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }

                    httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null);
                    });
                },
            ],
            function (err) {
                return callback(err, "graph cleared");
            }
        );
    },

    deleteKGcreatorTriples: function (sparqlServerUrl,graphUri,table, callback) {
        const KGbuilder_triplesMaker=require("./KGbuilder_triplesMaker")
        var query = "";
        if( table) {
            query += "with  GRAPH <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + KGbuilder_triplesMaker.mappingFilePredicate + "> '" + table + "'}";
        }
        else{
            query += "with  <" + graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + KGbuilder_triplesMaker.mappingFilePredicate + "> ?table }";

        }
        var params = { query: query };
        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }
        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
            if (err) {
                var x = query;
                return callback(err);
            }

            return callback(null, result.results.bindings[0]["callret-0"].value);
        });
    },


    deleteTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        var insertTriplesStr = "";
        var totalTriples = 0;
        triples.forEach(function (triple) {
            var str = triple.s + " " + triple.p + " " + triple.o + ". ";
            insertTriplesStr += str;
        });
        var query = KGbuilder_triplesWriter.getSparqlPrefixesStr();
        query += "DELETE DATA {  GRAPH <" + graphUri + "> {  " + insertTriplesStr + " }  } ";
        var params = { query: query };
        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
            if (err) {
                var x = query;
                return callback(err);
            }
            totalTriples += triples.length;
            return callback(null, totalTriples);
        });
    },

    getSparqlPrefixesStr: function () {
        var str = "";
        for (var key in KGbuilder_triplesWriter.sparqlPrefixes) {
            str += "PREFIX " + key + ": " + KGbuilder_triplesWriter.sparqlPrefixes[key] + " ";
        }
        return str;
    },
};

module.exports = KGbuilder_triplesWriter;
