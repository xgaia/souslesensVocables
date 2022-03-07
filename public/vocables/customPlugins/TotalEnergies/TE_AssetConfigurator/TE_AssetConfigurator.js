var TE_AssetConfigurator = (function () {
        var self = {}
        self.currentSource = "TSF-RDS-OG-81346"
        self.displayedDivsMap = {}
        self.objectsMap = {}
        self.systemsMap = {


            "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Construction_complexe_1": {
                label: "Construction complex",

                color: "#d54df3",
                level: 1,
                aspect: "Location",
                leafLevel: 1
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Construction_entity_2": {
                label: "Construction entity",

                color: "#d54df3",
                level: 2,
                aspect: "Location",
                leafLevel: 2
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Space_3": {
                label: "Space",

                color: "#d54df3",
                level: 3,
                aspect: "Location",
                leafLevel: 2
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Construction_Work_aspect/Functional_system_1": {
                label: "Functional system",
                color: "#619108",
                level: 1,
                aspect: "Construction work",
                leafLevel: 1
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Construction_Work_aspect/Technical_system_2": {
                label: "Technical system CW",

                color: "#619108",
                level: 2,
                aspect: "Construction work",
                leafLevel: 2
            },

            "http://data.total.com/resource/tsf/RDS_OG_81346/Function_aspect/Oil_and_gas_system_1": {
                label: "Oil & gas system",
                color: "#fab70e",
                aspect: "Function",
                level: 1,
                leafLevel: 1
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Function_aspect/Technical_system_2": {
                label: "Technical system F",

                color: "#fab70e",
                level: 2,
                aspect: "Function",
                leafLevel: 2
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Product_aspect/Component_system_3": {
                label: "Component",

                color: "#c7f8ea",
                level: 4,
                aspect: "Component",
                leafLevel: 4
            },


        }

        self.currentSystem = null

        self.onLoaded = function () {


            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/TE_AssetConfigurator/snippets/leftPanel.html", function () {
                //  $("#TE_AssetConfigurator_searchAllDiv").load("snippets/searchAll.html", function () {
                $("#GenericTools_searchInAllSources").prop("checked", false)
                $("#GenericTools_searchInAllSources").prop("checked", false)
                $(".GenericTools_searchAllOptional").css("display", "none")

                MainController.currentSource = self.currentSource
                $(".TE_AssetConfigurator_itemSelect").bind("change", function () {
                    TE_AssetConfigurator.on81346TypeSelect($(this).val(), $(this).attr("id"));
                    $(this).val("")
                })
                //  self.initSytemsTree();
                self.initSytemsSelect()

                Config.sources[self.currentSource].controller = Sparql_OWL
                visjsGraph.clearGraph()
                $("#graphDiv").css("width", "800px")
                self.listSavedGraphs()
                // })
            })
            //    $("#graphDiv").load("customPlugins/TotalEnergies/TE_AssetConfigurator/snippets/centralPanel.html")


            MainController.UI.toogleRightPanel(true)
            $("#rightPanelDiv").html("")
            $("#rightPanelDiv").load("customPlugins/TotalEnergies/TE_AssetConfigurator/snippets/rightPanel.html")

            $("#accordion").accordion("option", {active: 2});

        }
        self.initSytemsSelect = function () {


            var htmlAspects = []
            for (var key in self.systemsMap) {
                var obj = self.systemsMap[key]
                var divId = common.getRandomHexaId(10)
                var str = "<div class='AssetConfigurator_SystemDiv' id='" + divId + "'" +
                    " onclick='TE_AssetConfigurator.filterSytemTree(\"" + key + "\",\"" + divId + "\")'> " + obj.label + "</div>"

                if (!htmlAspects[obj.aspect])
                    htmlAspects[obj.aspect] = {html: "", color: obj.color};
                htmlAspects[obj.aspect].html += str

            }

            var html = ""
            for (var key in htmlAspects) {
                html += "<b>" + key + "</b>"
                html += "<div id='" + key + "'  class='AssetConfigurator_AspectDiv'' style='background-color: " + htmlAspects[key].color + " '>" +

                    htmlAspects[key].html +
                    "</div>"

            }
            $("#TE_AssetConfigurator_allSystemsDiv").append(html)

            return

        }

        self.initSytemsTree = function () {

            var options = {
                targetDiv: "TE_AssetConfigurator_81346TreeDiv",
                selectTreeNodeFn: function (evt, obj) {
                    var node = obj.node
                    self.currentTreeNode = node
                    SourceBrowser.openTreeNode("TE_AssetConfigurator_81346TreeDiv", self.currentSource, node)
                },

                contextMenu: TE_AssetConfigurator.getSystemsTreeContextMenu()

            }
            SourceBrowser.showThesaurusTopConcepts(self.currentSource, options)


        }

        self.getSystemsTreeContextMenu = function () {
            var items = {}


            items.addNode = {
                label: "add Node",
                action: function (e) {// pb avec source
                    TE_AssetConfigurator.addNode(self.currentTreeNode)
                }
            }

            items.nodeInfos = {
                label: "Node infos",
                action: function (e) {// pb avec source
                    SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv")
                }
            }
            return items

        }


        self.filterSytemTree = function (systemUri, sytemDivId) {
            if (!systemUri) {
                self.currentSystem = null;
                $(".AssetConfigurator_SystemDiv").removeClass("AssetConfigurator_SystemDiv_selected")
                return;
            }

            $(".AssetConfigurator_SystemDiv").removeClass("AssetConfigurator_SystemDiv_selected")
            $("#" + sytemDivId).addClass("AssetConfigurator_SystemDiv_selected")
            $("#TE_AssetConfigurator_searchInSystemInput").focus()


            self.currentSystem = systemUri

            Sparql_OWL.getNodeChildren(self.currentSource, null, systemUri, 3, {}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);


                var options = self.getJstreeOptions()
                TreeController.drawOrUpdateTree("TE_AssetConfigurator_81346TreeDiv", result, "#", "child1", options)


                self.setTreeSystemNodesInfos()
            })

        }
        self.getJstreeOptions = function () {
            var options = {
                selectTreeNodeFn: function (evt, obj) {
                    if (obj.event.ctrlKey) {
                        return self.addNode(obj.node)
                    }
                    var node = obj.node
                    self.currentTreeNode = node
                    var options = {optionalData: {systemType: node.data.systemType}}
                    SourceBrowser.openTreeNode("TE_AssetConfigurator_81346TreeDiv", self.currentSource, node, options)
                    self.setTreeSystemNodesInfos(obj.node.id)

                },
                contextMenu: TE_AssetConfigurator.getSystemsTreeContextMenu(),
                optionalData: {system: "concept"},

            }
            return options
        }

        self.addNode = function (node) {
            $("#AssetConfigurator_treeInfosDiv").html("");
            /*  if (node.parents.length + 1 < self.currentSystem.leafLevel)
                        return $("#AssetConfigurator_treeInfosDiv").html("not allowed , select a descendant")*/
            $("#AssetConfigurator_treeInfosDiv").html("adding " + node.data.label);

            var level = self.systemsMap[self.currentSystem].level
            if (self.currentGraphNode && self.currentGraphNode.data.aspect == "Component")
                level = self.currentGraphNode.data.level + 1

            node.data.level = level
            node.data.system = self.currentSystem
            node.data.aspect = self.systemsMap[self.currentSystem].aspect


            if (!self.objectsMap[node.data.id]) {
                self.objectsMap[node.data.id] = {counter: 0, items: []}
            }
            var counter = self.objectsMap[node.data.id].counter + 1
            self.objectsMap[node.data.id].counter = counter;


            node.data.number = counter

            var existingNodes = visjsGraph.getExistingIdsMap()
            var visjsData = {nodes: [], edges: []}
            var visjsId = common.getRandomHexaId(10);
            var code = self.systemsMap[self.currentSystem].items[node.data.id].code
            node.data.definition = self.systemsMap[self.currentSystem].items[node.data.id].definition
            node.data.example = self.systemsMap[self.currentSystem].items[node.data.id].example
            node.data.code = code
            node.data.number = counter
            var node = {
                id: visjsId,
                label: code + counter,
                data: node.data,
                level: level,
                shape: "square",
                size: 10,
                color: self.systemsMap[self.currentSystem].color
            }
            visjsData.nodes.push(node)

            if (self.currentGraphNode)
                self.createRelation(node, self.currentGraphNode, function (err, result) {
                    if (err)
                        MainController.UI.message(err)
                    else
                        visjsData.edges = visjsData.edges.concat(result.edges)
                })
            //  self.currentGraphNode = node

            self.addToGraph(visjsData)


        }
        self.addToGraph = function (visjsData) {
            if (visjsGraph.isGraphNotEmpty()) {
                //  if (Object.keys(visjsGraph.getExistingIdsMap()).length>0) {
                visjsGraph.data.nodes.add(visjsData.nodes)
                if (visjsData.edges.length > 0)
                    visjsGraph.data.edges.add(visjsData.edges)
                $("#graphDiv").focus()
            } else {
                var options = {

                    "layout": {
                        "hierarchical": {
                            "enabled": true,
                            "levelSeparation": 120,
                            "nodeSpacing": 150,
                            "sortMethod": "directed"
                        }
                    },
                    "physics": {
                        "enabled": false,
                        "hierarchicalRepulsion": {
                            "centralGravity": 0,
                            "nodeDistance": 0,
                            "avoidOverlap": 0
                        },
                        "minVelocity": 0.75,
                        "solver": "hierarchicalRepulsion"
                    },
                    edges: {
                        smooth: {
                            type: "cubicBezier",
                            forceDirection: "verical",

                            roundness: 0.4,
                        }
                    }
                }
                options.onclickFn = function (node, point, options) {
                    MainController.UI.hidePopup("graphPopupDiv")
                    self.currentGraphNode = node
                    if (options.ctrlKey) {
                        if (!self.relationObj)
                            self.relationObj = {start: node}
                        else {
                            self.relationObj.end = node
                            self.createRelation(self.relationObj.start, self.relationObj.end, function (err, visjsData) {
                                if (err)
                                    MainController.UI.message(err)
                                else {
                                    var existingNodes = visjsGraph.getExistingIdsMap()
                                    visjsGraph.data.edges.add(visjsData.edges)
                                    self.relationObj = null;

                                }

                            })
                        }
                    }
                }
                options.onHoverNodeFn = function (node, point, options) {

                    self.showGraphNodeInfos(node)
                }
                options.onRightClickFn = TE_AssetConfigurator.showGraphPopupMenus

                visjsGraph.draw("graphDiv", visjsData, options, function () {

                })


            }
            self.setSystemTypesSelectVisibility(self.currentSystem.level);

            setTimeout(function () {
                visjsGraph.network.redraw()
            }, 20)

        }


        self.showGraphNodeInfos = function (node) {
            self.getNodeClassificationTree(node.data.id, function (err, parentsMap) {
                if (err)
                    return MainController.UI.message(err)
                var parentsStr = "<ol>"
                var i = 0
                for (var key in parentsMap) {
                    parentsStr += "<li>" + parentsMap[key] + "</li>"

                }
                parentsStr += "</ol>"

                var html = "<table>"
                html += "<tr><td>Aspect: <b>" + self.systemsMap[node.data.system].aspect + "</td></tr>"
                html += "<tr><td>System:  <b>" + self.systemsMap[node.data.system].label + "</td></tr>"
                html += "<tr><td>Classification:  <b>" + parentsStr + "</td></tr>"
                html += "<tr><td>Label:  <b>" + node.data.label + "</td></tr>"
                html += "<tr><td>Location TAG  <b>:" + self.getNodeTag(node).locationTag + "</B></td></tr>"
                html += "<tr><td>Function TAG  <b>:" + self.getNodeTag(node).functionTag + "</B></td></tr>"
                html += "</table>"

                $("#AssetConfigurator_graphHOverDiv").html(html)
            })
        }


        self.showGraphPopupMenus = function (node, point, event) {
            if (!node)
                return MainController.UI.hidePopup("graphPopupDiv");
            if (node.from) {//edge
                var html = "    <span  class=\"popupMenuItem\"onclick=\"TE_AssetConfigurator.deleteSelectedEdge()();\"> Delete</span>"

            } else {

                var html = "    <span  class=\"popupMenuItem\"onclick=\"TE_AssetConfigurator.deleteSelectedObject()();\"> Delete</span>" +
                    "   <span  id='lineage_graphPopupMenuItem' class=\"popupMenuItem\" onclick=\"TE_AssetConfigurator.rename();\"> Rename</span>"
            }
            $("#graphPopupDiv").html(html);
            self.currentGraphNode = node;
            MainController.UI.showPopup(point, "graphPopupDiv")


        }
        self.setSystemTypesSelectVisibility = function (level) {

            return;
            var levels
            if (level == -1)
                levels = [1, 2, 3, 4, 5, 6, 7, 8]
            else
                levels = [level - 1, level, level + 1]
            for (var key in self.systemsMap) {
                if (levels.indexOf(self.systemsMap[key].level) < 0)
                    $("#" + key).css("display", "none")
                else
                    $("#" + key).css("display", "block")
            }
        }


        self.setSystemTypesSelectVisibilityOld = function () {
            var currentSystem = 10
            var currentSystem = null;
            if (self.currentDisplayDivId)
                currentSystem = self.displayedDivsMap[self.currentDisplayDivId].systemType
            if (currentSystem) {
                currentSystem = self.systemsMap[currentSystem].level
            }
            for (var key in self.systemsMap) {
                if (self.systemsMap[key].level > currentSystem + 1)
                    $("#" + key).css("display", "none")
                else
                    $("#" + key).css("display", "block")
            }
        }


        self.deleteSelectedObject = function () {
            visjsGraph.data.nodes.remove(self.currentGraphNode.id)
            /*  if (self.currentDisplayDivId) {
                  delete self.displayedDivsMap[self.currentDisplayDivId]
                  $("#" + self.currentDisplayDivId).remove();
                  self.currentDisplayDivId = null
              }*/

        }
        self.deleteSelectedEdge = function () {
            visjsGraph.data.edge.remove(self.currentGraphNode.id)
            /*  if (self.currentDisplayDivId) {
                  delete self.displayedDivsMap[self.currentDisplayDivId]
                  $("#" + self.currentDisplayDivId).remove();
                  self.currentDisplayDivId = null
              }*/

        }


        self.clearAll = function () {
            visjsGraph.clearGraph()
            self.displayedDivsMap = {}
            $("#AssetConfigurator_displayDiv").html("");
            self.currentDisplayDivId = null;
            self.setSystemTypesSelectVisibility(-1)
            self.currentGraphNode = null;
        }


        self.getNodeTag = function (targetNode) {
            if (!targetNode)
                return;
            var edges = visjsGraph.data.edges.get()
            var nodeIds = []
            if (edges.length < 1)
                return {
                    locationTag: "-" + targetNode.data.code + targetNode.data.number,
                    functionTag: "-" + targetNode.data.code + targetNode.data.number
                }


            edges.forEach(function (edge) {
                if (edge.from == targetNode.id || edge.to == targetNode.id)

                    if (nodeIds.indexOf(edge.from) < 0)
                        nodeIds.push(edge.from)
                if (nodeIds.indexOf(edge.to) < 0)
                    nodeIds.push(edge.to)
            })
            if (nodeIds.length == 0)
                return ""
            var nodes = visjsGraph.data.nodes.get(nodeIds)


            nodes.sort(function (a, b) {
                if (a.data.level > b.data.level)
                    return 1
                if (a.data.level < b.data.level)
                    return -1
                return 0
            })


            var bulQueryStr = ""
            var header = {}


            var locationTag = ""
            var functionTag = ""
            nodes.forEach(function (node) {
                if (node.data.number != targetNode.data.number)
                    return;

                if (node.data.level > targetNode.data.level)
                    return;
                if (node.data.aspect == "Component") {
                    locationTag += "-" + node.data.code + node.data.number
                    functionTag += "-" + node.data.code + node.data.number
                } else {

                    if (node.data.aspect != targetNode.data.aspect && targetNode.data.aspect != "Component")
                        return;

                    if (node.data.aspect == "Location" || node.data.aspect == "Construction work") {
                        // if(locationTag!="")
                        locationTag += "+"
                        locationTag += node.data.code + node.data.number
                    }
                    if (node.data.aspect == "Function") {
                        // if(functionTag!="")
                        functionTag += "="
                        functionTag += node.data.code + node.data.number
                    }
                }
            })


            return {functionTag: functionTag, locationTag: locationTag}

        }


        self.createRelation = function (startNode, endNode, callback) {

            var getEdge = function (relationType, drawLabel) {
                var edgeId = common.getRandomHexaId(10);
                var edge
                if (startNode.data.level < endNode.data.level) {
                    edge = {
                        id: edgeId,
                        from: endNode.id,
                        to: startNode.id,
                        data: {
                            from: endNode.id,
                            to: startNode.id,
                            property: relationType


                        }
                    }
                } else {
                    edge = {
                        id: edgeId,
                        from: startNode.id,
                        to: endNode.id,
                        data: {
                            from: startNode,
                            to: endNode.id,
                            property: relationType


                        }
                    }
                }

                edge.smooth = {
                    type: "cubicBezier",
                    forceDirection: "verical",

                    roundness: 0.4,
                }

                if (relationType) {
                    edge.label = relationType;
                    edge.dashes = true;
                    edge.data.type = relationType
                }

                return edge;
            }

            var visjsData = {edges: []}
            var globalOK = false
            if (startNode.data.aspect == endNode.data.aspect) {

                if (startNode.data.aspect == "Component") {

                    visjsData.edges.push(getEdge("part14:partOf"))
                    globalOK = true

                } else {


                    var deltaLevel = Math.abs(startNode.data.level - endNode.data.level)
                    if (deltaLevel == 1) {
                        var propName
                        if (startNode.data.aspect == "Location") {
                            visjsData.edges.push(getEdge("part14:hasLocation"))
                        }
                        if (startNode.data.aspect == "Function") {
                            visjsData.edges.push(getEdge("part14:hasFunction"))
                        }

                        globalOK = true
                    }
                }

            } else {
                var ok1 = startNode.data.aspect == "Location" && endNode.data.aspect == "Component"
                var ok2 = startNode.data.aspect == "Component" && endNode.data.aspect == "Location"
                var ok3 = startNode.data.level == endNode.data.level
                if ((ok1 || ok2)) {

                    visjsData.edges.push(getEdge("part14:hasLocation", true))
                    globalOK = true
                } else {
                    var ok1 = startNode.data.aspect == "Function" && endNode.data.aspect == "Component"
                    var ok2 = startNode.data.aspect == "Component" && endNode.data.aspect == "Function"
                    var ok3 = startNode.data.level == endNode.data.level

                    if ((ok1 || ok2)) {

                        visjsData.edges.push(getEdge("part14:implements", true))
                        globalOK = true
                    }
                }

            }
            var err = null
            if (!globalOK)
                err = "relation not allowed "

            return callback(err, visjsData)
        }

        self.setTreeSystemNodesInfos = function (topNode) {

            setTimeout(function () {
                if (!topNode)
                    topNode = "#"
                var treeNodes = common.jstree.getjsTreeNodes("TE_AssetConfigurator_81346TreeDiv", false, "#")
                var ids = []
                treeNodes.forEach(function (item) {
                    ids.push(item.data.id)
                })
                var options = {
                    filter: Sparql_common.setFilter("concept", ids)
                }
                Sparql_OWL.getItems(self.currentSource, options, function (err, result2) {
                    if (err)
                        return MainController.UI.message(err);
                    if (!self.systemsMap[self.currentSystem].items)
                        self.systemsMap[self.currentSystem].items = {}
                    result2.forEach(function (item) {
                        var obj = {id: item.concept.value}
                        obj.code = item.concept.value.substring(item.concept.value.lastIndexOf("/") + 1)
                        /*if (item.p.value == "http://souslesens.org/resource/vocabulary/hasCode")
                            obj.code = item.o.value*/
                        if (item.p.value == "http://www.w3.org/2004/02/skos/core#definition")
                            obj.definition = item.o.value

                        if (item.p.value == "http://www.w3.org/2004/02/skos/core#example")
                            obj.example = item.o.value
                        self.systemsMap[self.currentSystem].items[obj.id] = obj
                    })

                })
            }, 500)
        }


        self.saveGraph = function (isNewGraph) {
            if (isNewGraph) {
                var graphName = prompt("graph name")
                if (graphName) {
                    visjsGraph.saveGraph("RDS_" + graphName, true)
                    self.listSavedGraphs();
                }
            } else {
                visjsGraph.saveGraph(self.currentGraphName, true)
                self.listSavedGraphs();

            }
        }
        self.loadGraph = function (graphName) {
            visjsGraph.clearGraph()
            self.objectsMap = {}
            self.currentGraphName = graphName

            visjsGraph.loadGraph(graphName, false, function (err, visjsData) {
                visjsData.nodes.forEach(function (node) {
                    if (!self.objectsMap[node.data.id])
                        self.objectsMap[node.data.id] = {items: [], counter: 0}
                    self.objectsMap[node.data.id].counter = Math.max(self.objectsMap[node.data.id].counter, node.data.number)
                    self.objectsMap[node.data.id].items.push(node)
                })
                self.addToGraph(visjsData)
            })
        }


        /*

                        var id=common.getRandomHexaId(10)
                    self.addToGraph({nodes: [{id: id, "label": graphName, level: 0, shape: "box"}], edges: []})

                     visjsGraph.loadGraph(graphName, true, function (err, result) {
                        var nodes = visjsGraph.data.nodes.get()
                         visjsGraph.data.nodes.remove(id)
                        self.objectsMap = {}
                        nodes.forEach(function (node) {
                            if (!self.objectsMap[node.data.id])
                                self.objectsMap[node.data.id] = {items: [], counter: 0}
                            self.objectsMap[node.data.id].counter = Math.max(self.objectsMap[node.data.id].counter, node.data.number)
                            self.objectsMap[node.data.id].items.push(node)
                            //if(item.data.level==1)

                        })

                     })*/


        self.listSavedGraphs = function () {
            visjsGraph.listSavedGraphs(function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                var graphs = []
                result.forEach(function (item) {
                    if (item.indexOf("RDS_") == 0)
                        graphs.push(item)
                })
                common.fillSelectOptions("TE_AssetConfigurator_savedGraphsSelect", graphs, true)
            })
        }


        self.getNodeClassificationTree = function (nodeId, callback) {
            var matchingHits;
            var parentIdsMap = {};
            async.series([
                function (callbackSeries) {
                    var queryObj = {
                        query: {
                            "term": {
                                "id.keyword": nodeId,

                            }
                        }
                    }
                    ElasticSearchProxy.queryElastic(queryObj, self.currentSource.toLowerCase(), function (err, result) {
                        if (err)
                            MainController.UI.message(err)
                        matchingHits = result.hits.hits
                        if (matchingHits.length == 0)
                            return callbackSeries("no result")
                        return callbackSeries();

                    })
                },
                //get parents
                function (callbackSeries) {
                    var parentIds = []
                    matchingHits.forEach(function (hit) {
                        hit._source.parents.forEach(function (item, indexParent) {
                            if (parentIds.indexOf(item) < 0)
                                parentIds.push(item)
                        })
                    })
                    SearchUtil.getSourceLabels(self.currentSource.toLowerCase(), parentIds, null, null, function (err, hits) {
                        if (err)
                            return callbackSeries(err)
                        hits.forEach(function (hit) {
                            parentIdsMap[hit._source.id] = hit._source.label
                        })
                        callbackSeries()
                    })
                }
            ], function (err) {
                return callback(err, parentIdsMap)

            })
        }


        self.searchInCurrentSystem = function (word) {
            var matchingHits
            var parentIdsMap = {}
            async.series([
                    function (callbackSeries) {
                        var queryObj = {
                            query: {
                                "bool": {
                                    "must": [

                                        {
                                            "wildcard": {
                                                "label": {
                                                    "value": word,
                                                    "boost": 1.0,
                                                    "rewrite": "constant_score"
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                        if (self.currentSystem) {
                            queryObj.query.bool.must.push(
                                {
                                    "term": {
                                        "parents.keyword": self.currentSystem,

                                    }
                                })


                        }
                        ElasticSearchProxy.queryElastic(queryObj, self.currentSource.toLowerCase(), function (err, result) {
                            if (err)
                                MainController.UI.message(err)
                            matchingHits = result.hits.hits
                            if (matchingHits.length == 0)
                                return callbackSeries("no result")
                            return callbackSeries();

                        })
                    },

                    //get parents
                    function (callbackSeries) {
                        var parentIds = []
                        matchingHits.forEach(function (hit) {
                            hit._source.parents.forEach(function (item, indexParent) {


                                if (parentIds.indexOf(item) < 0)
                                    parentIds.push(item)
                            })
                            if (parentIds.indexOf(hit._source.id) < 0)
                                parentIds.push(hit._source.id)
                        })

                        SearchUtil.getSourceLabels(self.currentSource.toLowerCase(), parentIds, null, null, function (err, hits) {
                            if (err)
                                return callbackSeries(err)
                            hits.forEach(function (hit) {
                                parentIdsMap[hit._source.id] = {
                                    label: hit._source.label,
                                    code: hit._source.skoslabels[0] || "ex"
                                }
                            })
                            callbackSeries()
                        })
                    },

                    function (callbackSeries) {
                        var ids = Object.keys(parentIdsMap)
                        self.setTreeItemSameAs(ids, function (err, result) {
                                if (err)
                                    return callbackSeries(err)
                            self.currentSameAsIds={}
                                result.forEach(function (item) {
                                    if(! self.currentSameAsIds[item.concept.value])
                                    self.currentSameAsIds[item.concept.value]=[]
                                    self.currentSameAsIds[item.concept.value].push( self.currentSameAsIds[item.value.value])

                                }  )
                            callbackSeries()

                        })
                    },

                    //set tree
                    function (callbackSeries) {

                        var jstreeData = []
                        var existingNodes = {}

                        matchingHits.forEach(function (hit) {
                            var parent
                            hit._source.parents.forEach(function (item, indexParent) {
                                if (indexParent == 0) {
                                    return;
                                }

                                if (indexParent == 1)
                                    parent = "#"
                                else
                                    parent = hit._source.parents[indexParent - 1]

                                if (!existingNodes[item]) {
                                    existingNodes[item] = 1
                                    var label
                                    if (parentIdsMap[item])
                                        label = parentIdsMap[item].code + " " + parentIdsMap[item].label
                                    else
                                        label = Sparql_common.getLabelFromURI(item)

                                    if( self.currentSameAsIds[item])
                                        label="* "+label
                                    jstreeData.push({
                                        id: item,
                                        text: label,
                                        parent: parent,
                                        data: {
                                            id: item,
                                            label: parentIdsMap[item] ? parentIdsMap[item].label : Sparql_common.getLabelFromURI(item),
                                            sameAsIds:self.currentSameAsIds[item],
                                            source: self.currentSource,
                                            code: parentIdsMap[item] ? parentIdsMap[item].code : Sparql_common.getLabelFromURI(item)
                                        }
                                    })
                                }
                            })


                            var label2 = parentIdsMap[hit._source.id].code + " " + parentIdsMap[hit._source.id].label
                            if( self.currentSameAsIds[hit._source.id])
                                label2="* "+label2
                            jstreeData.push({
                                id: hit._source.id,
                                text: label2, // Sparql_common.getLabelFromURI(hit._source.id) + " " + hit._source.label,
                                parent: parent,
                                data: {
                                    id: hit._source.id,
                                    label: label2,
                                    sameAsIds:self.currentSameAsIds[hit._source.id],
                                    source: self.currentSource,
                                    code: parentIdsMap[hit._source.id].code,
                                }
                            })

                        })
                        var options = self.getJstreeOptions()
                        options.openAll = true;
                        common.jstree.loadJsTree("TE_AssetConfigurator_81346TreeDiv", jstreeData, options)

                    }
                ],

                function (err) {
                    if (err)
                        return MainController.UI.message(err)

                })
        }

        self.switchLabelsAndCodesInGraph = function (value) {
            var nodes = visjsGraph.data.nodes.get();
            var newNodes = []
            nodes.forEach(function (node) {
                if (!node.data)
                    return;
                var label
                if (value == "codes")
                    label = node.data.code;
                else
                    label = node.data.label;

                newNodes.push({id: node.id, label: label})

            })
            visjsGraph.data.nodes.update(newNodes)

        }

        self.setTreeItemSameAs = function (ids,callback) {

            Sparql_OWL.getObjectRestrictions(Config.dictionarySource, ids, {filter: "FILTER (?prop=owl:sameAs) "}, function (err, result) {
                if (err)
                    return callback(err.responseText)
                return callback(null,result)
            })


        }


        return self;
    }
)
()