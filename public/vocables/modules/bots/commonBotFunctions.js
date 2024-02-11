import BotEngine from "./botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
import OntologyModels from "../shared/ontologyModels.js";

var CommonBotFunctions = (function() {
    var self = {};

    self.sortList = function(list) {
        list.sort(function(a, b) {
            if (a.label.indexOf("_") == 0) {
                return 1;
            }
            if (a.label > b.label) {
                return 1;
            }
            if (a.label < b.label) {
                return -1;
            }
            return 0;
        });
    };

    self.loadSourceOntologyModel = function(sourceLabel, withImports, callback) {
        var sources = [sourceLabel];
        if (!Config.sources[sourceLabel]) {
            alert("Source not recognized");
            return BotEngine.end();
        }
        if (Config.sources[sourceLabel].imports) {
            sources = sources.concat(Config.sources[sourceLabel].imports);
        }
        async.eachSeries(
            sources,
            function(source, callbackEach) {
                OntologyModels.registerSourcesModel(source, function(err, result) {
                    callbackEach(err);
                });
            },
            function(err) {
                return callback(err);
            }
        );
    };

    self.listVocabsFn = function(sourceLabel, varToFill, includeBasicVocabs) {
        var vocabs = [{ id: sourceLabel, label: sourceLabel }];
        var imports = Config.sources[sourceLabel].imports;
        if (imports) {
            imports.forEach(function(importSource) {
                vocabs.push({ id: importSource, label: importSource });
            });
        }
        if (includeBasicVocabs) {
            for (var key in Config.basicVocabularies) {
                vocabs.push({ id: key, label: key });
            }
        }
        if (vocabs.length == 0) {
            return BotEngine.previousStep("no values found, try another option");
        }

        BotEngine.showList(vocabs, varToFill);
    };

    self.listVocabClasses = function(vocab, varToFill, includeOwlThing, classes) {
        OntologyModels.registerSourcesModel(vocab, function(err, result) {
            if (err) {
                return alert(err.responseText);
            }
            if (!classes) {
                classes = [];
            }

            for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
                var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
                classes.push({ id: classId.id, label: classId.label });
            }

            self.sortList(classes);
            if (includeOwlThing || classes.length == 0) {
                classes.splice(0, 0, { id: "owl:Thing", label: "owl:Thing" });
            }

            BotEngine.showList(classes, varToFill);
        });
    };

    self.listVocabPropertiesFn = function(vocab, varToFill, props) {
        OntologyModels.registerSourcesModel(vocab, function(err, result) {
            if (!props) {
                props = [];
            }
            for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
                var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
                props.push({ id: prop.id, label: prop.label });
            }
            if (props.length == 0) {
                return BotEngine.previousStep("no values found, try another option");
            }
            self.sortList(props);
            BotEngine.showList(props, varToFill);
        });
    };

    self.listAnnotationPropertiesFn = function(vocabs, varToFill) {
        if (!vocabs) {
            vocabs = Object.keys(Config.ontologiesVocabularyModels);
        }
        if (!Array.isArray(vocabs)) {
            vocabs = [vocabs];
        }
        var props = [];
        async.eachSeries(
            vocabs,
            function(vocab, callbackEach) {
                OntologyModels.registerSourcesModel(vocab, function(err, result) {
                    for (var key in Config.ontologiesVocabularyModels[vocab].annotationProperties) {
                        var prop = Config.ontologiesVocabularyModels[vocab].annotationProperties[key];
                        props.push({ id: prop.id, label: vocab + ":" + prop.label });
                    }
                    callbackEach();
                });
            },
            function(err) {
                if (props.length == 0) {
                    return BotEngine.previousStep("no values found, try another option");
                }
                self.sortList(props);
                BotEngine.showList(props, varToFill);
            }
        );
    };

    self.getColumnClasses = function(tripleModels, columnName) {
        var columnClasses =null;
        tripleModels.forEach(function(item) {
            if ((item.s == columnName || item.s == "$_" + columnName) && item.p == "rdf:type") {
                if (item.o.indexOf("owl:") < 0) {
                    if(!columnClasses)
                        columnClasses=[]
                    columnClasses.push(item.o);
                }
            }
        });
        return columnClasses;
    };

    return self;
})();
export default CommonBotFunctions;
