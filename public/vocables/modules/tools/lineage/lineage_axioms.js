import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import TriplesToVisjs from "../../shared/triplesToVisjs.js";

var Lineage_axioms = (function () {
    var self = {};

    self.getAllBasicAxioms = function (sourceLabel, callback) {
        if (!sourceLabel) {
            sourceLabel = Lineage_sources.activeSource;
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct * from <https://purl.industrialontologies.org/ontology/core/Core>  from <https://purl.industrialontologies.org/ontology/core/Core> WHERE {" +
            "  ?X ?p_x ?x ." +
            "  { select ?x ?p_iu ?iu ?p_y ?y ?p_bn ?bn ?p_bny ?bny from <https://purl.industrialontologies.org/ontology/core/Core>  from <https://purl.industrialontologies.org/ontology/core/Core> where{" +
            "  ?x  (owl:intersectionOf|owl:union) ?iu." +
            "     ?x  ?p_iu ?iu." +
            "optional{ ?iu ?p_y ?y." +
            "  filter (!isBlank(?y))}" +
            "  " +
            "  optional{ ?iu ?p_bn ?bn." +
            "  filter (isBlank(?bn))" +
            "?bn  ?p_bny ?bny" +
            "  " +
            "      }" +
            "    }" +
            "  " +
            "  }" +
            "  " +
            " " +
            "}order by ?X ";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", { type: "http://www.w3.org/2002/07/owl#Class" });

            return callback(null, result.results.bindings);
        });
    };

    self.getMergedBasicAxioms = function (sourceLabel, callback) {
        self.getAllBasicAxioms(sourceLabel, function (err, result) {
            if (err) {
                return callback(err);
            }

            var allNodesMap = {};
            result.forEach(function (item) {
                item.axioms = {};
                allNodesMap[item.X.value] = item;
            });

            result.forEach(function (item) {
                for (var key in item) {
                    if (key != "X" && item[key].type == "bnode") {
                        if (allNodesMap[item[key].value]) {
                            allNodesMap[item.X.value].axioms[item[key].value] = allNodesMap[item[key].value];
                        }
                    }
                }
            });

            callback(null, allNodesMap);
        });
    };

    self.processAxioms = function (sourceLabel, nodes, callback) {
        var sourceLabel = Lineage_sources.activeSource;
        self.getAllBasicAxioms(sourceLabel, function (err, result) {
            var allNodesMap = {};
            result.forEach(function (item) {
                item.axioms = {};
                allNodesMap[item.X.value] = item;
            });

            var nodes = ["https://purl.industrialontologies.org/ontology/core/Core/MaterialArtifact"];

            var axiomsTriples = {};

            nodes.forEach(function (X) {
                var triples = [];

                function recurse(nodeId) {
                    var nodeBasicAxioms = allNodesMap[nodeId];
                    if (!nodeBasicAxioms) {
                        return;
                    }

                    triples.push({
                        subject: nodeBasicAxioms.X.value,
                        predicate: nodeBasicAxioms.p_x.value,
                        object: nodeBasicAxioms.x.value,
                    });
                    triples.push({
                        subject: nodeBasicAxioms.x.value,
                        predicate: nodeBasicAxioms.p_iu.value,
                        object: nodeBasicAxioms.iu.value,
                    });
                    if (nodeBasicAxioms.y) {
                        triples.push({
                            subject: nodeBasicAxioms.iu.value,
                            predicate: nodeBasicAxioms.p_y.value,
                            object: nodeBasicAxioms.y.value,
                        });
                    }
                    if (nodeBasicAxioms.bn) {
                        triples.push({
                            subject: nodeBasicAxioms.iu.value,
                            predicate: nodeBasicAxioms.p_bn.value,
                            object: nodeBasicAxioms.bn.value,
                        });
                        recurse(nodeBasicAxioms.bn.value);
                    }

                    if (nodeBasicAxioms.bny) {
                        triples.push({
                            subject: nodeBasicAxioms.bn.value,
                            predicate: nodeBasicAxioms.p_bny.value,
                            object: nodeBasicAxioms.bny.value,
                        });
                        recurse(nodeBasicAxioms.bny.value);
                    }
                }

                recurse(X);

                axiomsTriples[X] = triples;

                TriplesToVisjs.drawTriples(sourceLabel, triples);
            });

            var x = axiomsTriples;
        });
    };

    return self;
})();

export default Lineage_axioms;
window.Lineage_axioms = Lineage_axioms;
