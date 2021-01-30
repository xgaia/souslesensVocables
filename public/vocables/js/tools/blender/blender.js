var Blender = (function () {

        var self = {}
        var isLoaded = false
        self.modifiedNodes = []
        self.tempGraph;

        self.currentSource;
        self.currentTab = 0;
        self.backupSource = false// using  a clone of source graph
        self.displayMode = "leftPanel"
        self.onLoaded = function () {

            MainController.UI.message("");

            MainController.UI.openRightPanel()
            $("#accordion").accordion("option", {active: 2});
            // $("#actionDivContolPanelDiv").load("snippets/lineage/lineage.html")
            //  MainController.UI.toogleRightPanel("open");
            $("#rightPanelDiv").load("snippets/blender/blender.html")

            if (!MainController.currentTool)
                $("#graphDiv").html("")
            setTimeout(function () {
                    var editableSources = [];
                    for (var key in Config.sources) {

                        if (!Config.sources[key].controllerName) {
                            Config.sources[key].controllerName = "" + Config.sources[key].controller
                            Config.sources[key].controller = eval(Config.sources[key].controller)
                        }
                        if (Config.sources[key].editable)
                            editableSources.push(key)
                    }

                    common.fillSelectOptions("Blender_SourcesSelect", editableSources.sort(), true)
                    $("#Blender_PopupEditDiv").dialog({
                        autoOpen: false,
                        height: 600,
                        width: 600,
                        modal: true,
                    });
                    $("#Blender_tabs").tabs({
                        activate: function (event, ui) {
                            self.currentTab = $("#Blender_tabs").tabs('option', 'active')
                        }

                    })

                    $("#Blender_searchDiv").load("snippets/searchAll.html")
                    ThesaurusBrowser.currentTargetDiv = "Blender_conceptTreeDiv"


                }, 200
            )

        }


        self.onSourceSelect = function (source) {

            $("#Blender_conceptTreeDiv").html("");
            self.currentTreeNode = null;
            self.currentSource = null;
            $("#Blender_collectionTreeDiv").html("");
            Collection.removeTaxonomyFilter();
            $("#Blender_tabs").tabs("option", "active", 0);
            Collection.currentTreeNode = null;
            if (source == "") {
                return
            }


            self.currentSource = source
            MainController.searchedSource = self.currentSource

            async.series([
                    function (callbackSeries) {
                        OwlSchema.initSourceSchema(source, function (err, result) {
                            callbackSeries(err);
                        })
                    }

                    , function (callbackSeries) {
                        if (!self.backupSource) {
                            Config.sources[source].controller = eval(Config.sources[source].controller)
                            return callbackSeries();
                        }
                        self.currentSource = "_blenderTempSource"
                        Config.sources[self.currentSource] = {
                            "controller": Sparql_generic,
                            "sparql_url": Config.sources[source].sparql_server.url,// on the same server !!!
                            "graphUri": "http://souslesens/_backup/" + source,
                            "schema": "SKOS",
                            "predicates": {
                                "lang": "en"
                            },
                        };

                        Sparql_generic.copyGraph(source, Config.sources[self.currentSource].graphUri, function (err, result) {
                            callbackSeries(err);
                        })
                    },

                    function (callbackSeries) {
                        self.showTopConcepts(null, function (err, result) {
                            callbackSeries(err);
                        })


                    }
                    ,
                    function (callbackSeries) {
                        Collection.Sparql.getCollections(source, null, function (err, result) {
                            var jsTreeOptions = {};
                            jsTreeOptions.contextMenu = Collection.getJstreeContextMenu()
                            jsTreeOptions.selectTreeNodeFn = Collection.selectTreeNodeFn;

                            jsTreeOptions.dnd = Blender.dnd
                            TreeController.drawOrUpdateTree("Blender_collectionTreeDiv", result, "#", "collection", jsTreeOptions, function () {
                                var firstNodeId = $("#Blender_collectionTreeDiv").jstree(true).get_node("#").children[0];
                                var firstNode = $("#Blender_collectionTreeDiv").jstree(true).get_node(firstNodeId);

                                Collection.openTreeNode("Blender_collectionTreeDiv", Blender.currentSource, firstNode)

                                callbackSeries(err);
                            })


                        })
                    }
                ],
                function (err) {
                    if (err)
                        return MainController.UI.message(err);
                })
        }

        self.copyGraph = function () {
            if (!self.currentSource) {
                return MainController.UI.message("select a source")
            }

            var newGraphUri = prompt("newGraphUri")
            if (newGraphUri && newGraphUri != "")
                Sparql_generic.copyGraph(self.currentSource, newGraphUri, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                    MainController.UI.message("graph Copied");
                })
        }

        self.showTopConcepts = function (collectionIds, callback) {
            var options = {};
            if (collectionIds)
                options.filterCollections = collectionIds
            Sparql_generic.getTopConcepts(self.currentSource, options, function (err, result) {
                if (err) {
                    MainController.UI.message(err);
                    return callback(err)
                }
                var jsTreeOptions = self.getConceptJstreeOptions(false  )
                TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", result, "#", "topConcept", jsTreeOptions)
                return callback()
            })

        }
        self.getConceptJstreeOptions = function (withDnd) {
            var jsTreeOptions = {};
            jsTreeOptions.source = self.currentSource
            jsTreeOptions.contextMenu = Blender.getJstreeConceptsContextMenu()
            jsTreeOptions.selectTreeNodeFn = Blender.selectTreeNodeFn
            if (withDnd) {

                jsTreeOptions.dropAllowedFn = Blender.dnd.dropAllowed
                jsTreeOptions.dnd = self.dnd
            }

            return jsTreeOptions;

        }

        self.dnd = {

            "drag_start": function (data, element, helper, event) {
                Blender.currentDNDstartNodeId = element.data.nodes[0]
                return true;
            },
            "drag_move": function (data, element, helper, event) {
                return true;
            },
            "drag_stop": function (data, element, helper, event) {


                Blender.menuActions.dropNode(function (err, result) {
                    return;
                })
                return true;


            },
            dropAllowed: function (operation, node, parent, position, more) {
                console.log(operation)
                Blender.currentDNDoperation = {operation: operation, node: node, parent: parent, position: position, more, more}

                return true;
            },

        },


            self.selectTreeNodeFn = function (event, propertiesMap) {
                if (propertiesMap) {
                    self.currentTreeNode = propertiesMap.node
                    $("#Blender_conceptTreeDiv").jstree(true).settings.contextmenu.items = self.getJstreeConceptsContextMenu()

                    var source = self.currentTreeNode.data.source || self.currentSource;
                    var type = self.currentTreeNode.data.type

                    var options = {source: source, labelClass: "treeType_" + type}
                    if (Collection.currentCollectionFilter)
                        options.filterCollections = Collection.currentCollectionFilter;
                    ThesaurusBrowser.openTreeNode("Blender_conceptTreeDiv", source, propertiesMap.node, options);

                    if (type == "externalReferenceTopConcept")
                        return;
                    if (propertiesMap.event.ctrlKey) {
                        if (Blender.displayMode == "centralPanelDiv") {
                            self.nodeEdition.editNode("concept")
                        }
                        Clipboard.copy({
                            type: "node",
                            id: self.currentTreeNode.data.id,
                            label: self.currentTreeNode.text,
                            source: self.currentSource
                        }, self.currentTreeNode.data.id + "_anchor", propertiesMap.event)
                    }

                    if (self.currentTreeNode.children.length == 0)
                        ExternalReferences.openNarrowMatchNodes(self.currentSource, self.currentTreeNode)

                }
                //  $.jstree.defaults.contextmenu.items = self.getJstreeConceptsContextMenu();


            }


        self.getJstreeConceptsContextMenu = function () {
            var menuItems = {}
            if (!self.currentTreeNode || !self.currentTreeNode.data)
                return menuItems


            if (self.currentTreeNode.data.type == "externalReferenceTopConcept") {
                return ExternalReferences.getJstreeConceptsContextMenu(self.currentTreeNode)

            }


            if (self.currentTreeNode.data.type == "externalReference") {

                menuItems.showExternalReferenceNodeInfos = {

                    label: "view node properties",
                    action: function (obj, sss, cc) {
                        ExternalReferences.showExternalReferenceNodeInfos()
                    }
                }

                return menuItems;
            }
            menuItems.copyNode = {
                label: "Copy Node",
                action: function (e) {// pb avec source
                    Blender.menuActions.copyNode(e)
                }

            }

            var clipboard = Clipboard.getContent()
            if (clipboard.length > 0 && clipboard[0].type == "node") {
                menuItems.pasteNode = {
                    "label": "Paste...",
                    "separator_before": false,
                    "separator_after": true,

                    "action": false,
                    "submenu": {
                        pasteNode: {
                            label: "node",
                            action: function () {
                                self.menuActions.pasteClipboardNodeOnly();
                            }
                        },
                        pasteProperties: {
                            label: "some properties...",
                            action: function () {
                                self.menuActions.pasteClipboardNodeProperties()
                                ;
                            },
                        }
                        ,
                        pasteDescendants: {
                            label: " descendants",
                            action: function (obj, sss, cc) {
                                self.menuActions.pasteClipboardNodeDescendants()
                                ;
                            },
                        },
                        pasteAsReference: {
                            label: " reference",
                            action: function (obj, sss, cc) {
                                ExternalReferences.pasteAsReference()
                                ;
                            },
                        },

                        /*   pasteAscendants: {
                               label: "ascendants",
                               action: function (obj, sss, cc) {
                                   self.menuActions.pasteClipboardNodeAscendants()
                                   ;
                               },
                           }*/
                    }

                }

            } else if (clipboard && clipboard.type == "word") {
                menuItems.pasteDescendants = {
                    label: " create concept " + Clipboard.getContent().label,
                    action: function (obj, sss, cc) {
                        self.menuActions.createConceptFromWord()
                        ;
                    }

                }
            }

            menuItems.editNode = {
                label: "Edit node",
                action: function (obj, sss, cc) {
                    self.nodeEdition.editNode("concept")
                }
            }

            menuItems.deleteNode = {
                label: "Delete node",
                action: function (obj, sss, cc) {
                    self.menuActions.deleteNode("concept");
                },


            }
            menuItems.addChildNodeNode = {
                label: "Create child",
                action: function (obj, sss, cc) {
                    self.nodeEdition.createChildNode(null, "concept");
                    ;
                },
            },
                menuItems.importChildren = {
                    label: "Import child nodes",
                    action: function (obj, sss, cc) {
                        Import.showImportNodesDialog("concept");
                        ;
                    },
                }

            return menuItems;

        }


        self.menuActions = {
            copyNode: function (event) {
                Clipboard.copy({
                        type: "node",
                        id: self.currentTreeNode.data.id,
                        label: self.currentTreeNode.text,
                        source: self.currentTreeNode.data.source,
                        data: self.currentTreeNode.data
                    },
                    self.currentTreeNode.id + "_anchor",
                    event)
            },


            dropNode: function (callback) {
                var date = new Date();// sinon exécuté plusieurs fois!!!
                if (Blender.startDNDtime && date - Blender.startDNDtime < 2000)
                    return true;
                Blender.startDNDtime = date;

                var newParentData = Blender.currentDNDoperation.parent.data;
                var nodeData = Blender.currentDNDoperation.node.data
                var oldParentData = common.getjsTreeNodeObj("Blender_conceptTreeDiv", Blender.currentDNDstartNodeId).data;
                //   var oldParentData = Blender.currentTreeNode.data;
                var broaderPredicate;


                if (!confirm("Confirm : move concept node and descendants :" + nodeData.label + "?")) {
                    return
                }

                function execMoveQuery(subject, broaderPredicate, oldParentId, newParentId, callback) {
                    Sparql_generic.deleteTriples(self.currentSource, subject, broaderPredicate, oldParentId, function (err, result) {
                        if (err) {
                            return callback(err)
                        }
                        var triple = {subject: subject, predicate: broaderPredicate, object: newParentId, valueType: "uri"}
                        Sparql_generic.insertTriples(self.currentSource, [triple], function (err, result) {
                            if (err) {
                                callback(err)
                            }
                            callback()

                        })
                    })


                }

                function processCallBack(err, result) {
                    if (err) {
                        MainController.UI.message(err)
                        return false;
                    }
                    MainController.UI.message("node moved")
                    return true;
                }


                if (Config.sources[nodeData.source].schemaType == "OWL") {

                    var broaderPredicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf"
                    execMoveQuery(nodeData.id, broaderPredicate, oldParentData.id, newParentData.id, function (err, result) {
                        return processCallBack(err, result)
                    })
                } else if (Config.sources[nodeData.source].schemaType == "SKOS") {
                    if (nodeData.type == "http://www.w3.org/2004/02/skos/core#Collection") {
                        broaderPredicate = "http://www.w3.org/2004/02/skos/core#member"
                        Sparql_generic.deleteTriples(self.currentSource, oldParentData.id, broaderPredicate, nodeData.id, function (err, result) {
                            if (err) {
                                return processCallBack(err, result)
                            }
                            var triple = {subject: newParentData.id, predicate: broaderPredicate, object: nodeData.id, valueType: "uri"}
                            Sparql_generic.insertTriples(self.currentSource, [triple], function (err, result) {
                                if (err) {
                                    callback(err)
                                }
                                callback()

                            })
                            return processCallBack(err, result)
                        })
                    } else {
                        broaderPredicate = "http://www.w3.org/2004/02/skos/core#broader"
                        execMoveQuery(nodeData.id, broaderPredicate, oldParentData.id, newParentData.id, function (err, result) {
                            return processCallBack(err, result)
                        })
                    }
                } else {
                    return false;
                }


            },


            deleteNode: function (type) {
                if (!type)
                    alert(" no type")

                var node;
                var treeDivId;
                if (type == "concept") {
                    node = self.currentTreeNode
                    treeDivId = "Blender_conceptTreeDiv"
                } else if (type == "collection") {
                    node = Collection.currentTreeNode
                    treeDivId = "Blender_collectionTreeDiv"
                }
                var str = ""
                if (node.children.length > 0)
                    str = " and all its descendants"
                if (confirm("delete node " + node.data.label + str)) {

                    var nodeIdsToDelete = [node.data.id]
                    async.series([

                            function (callbackSeries) {// descendants of type concept
                                if (node.children.length == 0)
                                    return callbackSeries();
                                if (type != "concept")
                                    return callbackSeries();

                                Sparql_generic.getSingleNodeAllDescendants(self.currentSource, node.data.id, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    var subjectsIds =
                                        result.forEach(function (item) {
                                            nodeIdsToDelete.push(item.narrower.value)
                                        })
                                    callbackSeries();
                                })
                            },
                            function (callbackSeries) {// descendants of type collection
                                if (node.children.length == 0)
                                    return callbackSeries();
                                if (type != "collection")
                                    return callbackSeries();


                                Collection.Sparql.getSingleNodeAllDescendants(self.currentSource, node.data.id, {onlyCollectionType: true}, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    var subjectsIds =
                                        result.forEach(function (item) {
                                            nodeIdsToDelete.push(item.narrower.value)
                                        })
                                    callbackSeries();
                                })

                            },

                            function (callbackSeries) {
                                Sparql_generic.deleteTriples(self.currentSource, nodeIdsToDelete, null, null, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    callbackSeries();
                                })
                            },
                            function (callbackSeries) {// delete members triple in parentNode
                                if (type == "concept")
                                    return callbackSeries();

                                Sparql_generic.deleteTriples(self.currentSource, node.parent, "http://www.w3.org/2004/02/skos/core#member", node.data.id, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    callbackSeries();
                                })

                            },
                            function (callbackSeries) {// delete from tree
                                common.deleteNode(treeDivId, node.id)
                                if (type == "concept") {
                                    self.currentTreeNode = null;
                                } else if (type == "collection") {
                                    Collection.currentTreeNode = null
                                }
                                callbackSeries();
                            }
                        ],

                        function (err) {
                            if (err) {
                                return MainController.UI.message(err)
                            }
                            $("#waitImg").css("display", "none");
                            MainController.UI.message("nodes deleted " + nodeIdsToDelete.length)
                        }
                    )
                }
            },


            pasteClipboardNodeOnly:

                function (callback) {
                    var dataArray = Clipboard.getContent();
                    if (!dataArray)
                        return;
                    async.eachSeries(dataArray, function (data, callbackEach) {


                        if (data.type == "node") {// cf clipboard and annotator
                            var fromSource = data.source;
                            var toGraphUri = Config.sources[self.currentSource].graphUri
                            var id = data.id;
                            var label = data.label;
                            var existingNodeIds = common.getjsTreeNodes("Blender_conceptTreeDiv", true)
                            if (existingNodeIds.indexOf(id) > -1) {
                                MainController.UI.message("node " + id + " already exists")
                                if (callback)
                                    return callback(null)
                            }

                            var additionalTriplesNt = []
                            var parentNodeId = self.currentTreeNode.data.id

                            if (Config.sources[self.currentSource].schemaType == "SKOS") {
                                additionalTriplesNt.push("<" + id + "> <http://www.w3.org/2004/02/skos/core#broader> <" + parentNodeId + ">.")
                                //   if(Config.sources[MainController.currentSource].schemaType=="OWL")
                                additionalTriplesNt.push("<" + id + "> <http://www.w3.org/2004/02/skos/core#prefLabel> '" + data.label + "'@en.")
                            } else if (Config.sources[self.currentSource].schemaType == "OWL") {
                                additionalTriplesNt.push("<" + id + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + parentNodeId + ">.")
                            } else
                                return alert("no schema")

                            Sparql_generic.copyNodes(fromSource, toGraphUri, id,
                                {
                                    additionalTriplesNt: additionalTriplesNt,
                                    //   setObjectFn: Blender.menuActions.setCopiedNodeObjectFn,
                                    // setPredicateFn: Blender.menuActions.setCopiedNodePredicateFn
                                },
                                function (err, result) {
                                    if (err)
                                        return MainController.UI.message(err);
                                    var jstreeData = [
                                        {
                                            id: id,
                                            text: label,
                                            parent: self.currentTreeNode.data.id,
                                            data: {
                                                type: "http://www.w3.org/2004/02/skos/core#Concept",
                                                source: self.currentSource,
                                                id: id,
                                                label: label
                                            }
                                        }
                                    ]
                                    common.addNodesToJstree("Blender_conceptTreeDiv", self.currentTreeNode.id, jstreeData)
                                    callbackEach()

                                })
                        }
                    }, function (err) {
                        if (!callback)
                            Clipboard.clear();
                        else
                            return callback(null)

                    })


                }

            ,
            setCopiedNodeObjectFn: function (item) {
                var newParent = self.currentTreeNode;
                if (item.prop.value == "http://www.w3.org/2004/02/skos/core#broader")
                    item.value.value = newParent.data.id;
                else if (item.prop.value == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                    item.prop.value = "http://www.w3.org/2004/02/skos/core#broader"
                    item.value.value = newParent.data.id;
                }

                return item


            }
            ,
            setCopiedNodePredicateFn: function (item) {


                return item
            },


            pasteClipboardNodeDescendants: function (callback) {
                var dataArray = Clipboard.getContent();
                if (!dataArray)
                    return;
                var totalNodesCount = 0
                async.eachSeries(dataArray, function (data, callbackEach) {

                    self.menuActions.pasteClipboardNodeOnly(function (err, result) {

                        Clipboard.clear();

                        var existingNodeIds = common.getjsTreeNodes("Blender_conceptTreeDiv", true)
                        var fromSource = data.source;
                        var toGraphUri = Config.sources[self.currentSource].graphUri
                        var id = data.id;
                        var label = data.label;
                        var depth = 3
                        var childrenIds = [id]
                        var currentDepth = 1

                        async.whilst(
                            function test(cb) {
                                return childrenIds.length > 0
                            },

                            function (callbackWhilst) {//iterate

                                Sparql_generic.getNodeChildren(fromSource, null, childrenIds, 1, null, function (err, result) {
                                    if (err)
                                        return MainController.UI.message(err);
                                    childrenIds = []
                                    if (result.length == 0)
                                        return callbackWhilst();
                                    totalNodesCount += result.length
                                    var items = {}
                                    result.forEach(function (item) {

                                        var parentId;
                                        if (item["child" + currentDepth]) {

                                            parentId = item.concept.value;

                                            var childId = item["child" + currentDepth].value
                                            if (existingNodeIds.indexOf(childId) > -1) {

                                                return MainController.UI.message("node " + id + " already exists")
                                            }

                                            childrenIds.push(childId)
                                            if (!items[parentId])
                                                items[parentId] = [];
                                            items[parentId].push(item)
                                        }

                                    })


                                    Sparql_generic.copyNodes(fromSource, toGraphUri, childrenIds, {}, function (err, result) {
                                        if (err)
                                            return callbackWhilst(err)
                                        for (var parentId in items) {
                                            TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", items[parentId], parentId, "child" + currentDepth, null)
                                        }

                                        callbackWhilst();

                                    })


                                })
                            }
                            , function (err) {
                                if (err)
                                    callbackEach(err);
                                callbackEach();
                            })
                    })
                }, function (err) {
                    if (err)
                        return MainController.UI.message(err)
                    return MainController.UI.message("copied " + totalNodesCount + " nodes")
                })


            }


            /**
             *
             *  A FINIR
             *
             *
             * @param callback
             */
            ,
            pasteClipboardNodeAscendants: function () {
                var data = Clipboard.getContent();
                if (!data)
                    return;

                self.menuActions.pasteClipboardNodeOnly(function (err, result) {

                    var existingNodeIds = common.getjsTreeNodes("Blender_conceptTreeDiv", true)
                    var fromSource = data.source;
                    var toGraphUri = Config.sources[self.currentSource].graphUri
                    var id = data.id;
                    var label = data.label;
                    var depth = 8
                    Sparql_generic.getNodeParents(fromSource, null, id, depth, null, function (err, result) {
                        if (err)
                            return MainController.UI.message(err);
                        var childrenIds = []

                        if (result.length > 0) {
                            for (var i = 1; i <= depth; i++) {
                                var items = {}
                                result.forEach(function (item) {

                                    var parentId;
                                    if (item["broader" + i]) {
                                        if (i == 1) {
                                            parentId = id
                                        } else {
                                            parentId = item["broader" + (i - 1)].value;

                                        }
                                        var childId = item["broader" + i].value
                                        if (existingNodeIds.indexOf(childId) > -1)
                                            return
                                        childrenIds.push(childId)
                                        if (!items[parentId])
                                            items[parentId] = [];
                                        items[parentId].push(item)


                                    }


                                })
                                for (var parentId in items) {
                                    TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", items[parentId], parentId, "broader" + i, null)
                                }


                            }
                            Sparql_generic.copyNodes(fromSource, toGraphUri, childrenIds, {}, function (err, result) {
                                if (err)
                                    return MainController.UI.message(err);


                            })


                        }
                        self.modified = true;

                    })


                })

            }
            ,
            pasteClipboardNodeProperties: function () {
                var data = Clipboard.getContent();
                Clipboard.clear();
            }
            ,


            createConceptFromWord: function () {
                var data = Clipboard.getContent();
                var initData = {"http://www.w3.org/2004/02/skos/core#prefLabel": [{"xml:lang": SourceEditor.prefLang, value: data.label, type: "literal"}]}
                self.nodeEdition.createChildNode(initData, "concept")
            }
            ,


        }


        self.nodeEdition = {
            createSchemeOrCollection: function (type) {
                var skosType;
                if (type == "Scheme") {
                    skosType = "http://www.w3.org/2004/02/skos/core#ConceptScheme"
                    self.currentTreeNode = $("#Blender_conceptTreeDiv").jstree(true).get_node("#")
                    $("#Blender_tabs").tabs("option", "active", 0);
                } else if (type == "Collection") {

                    skosType = "http://www.w3.org/2004/02/skos/core#Collection"
                    Collection.currentTreeNode = $("#Blender_collectionTreeDiv").jstree(true).get_node("#")
                    $("#Blender_tabs").tabs("option", "active", 1);
                } else
                    return;

                if (!self.currentSource) {
                    return alert("select a source");
                }

                self.nodeEdition.openDialog()
                var initData = {
                    "http://www.w3.org/2004/02/skos/core#prefLabel":
                        [{"xml:lang": Config.sources[self.currentSource].prefLang || "en", value: "", type: "literal"}]
                }

                SourceEditor.editNewObject("Blender_nodeEditionDiv", self.currentSource, skosType, initData);

            }


            ,
            editNode: function (type) {
                if (!type)
                    alert(" no type")


                if (type == "concept") {

                    var skosType = "http://www.w3.org/2004/02/skos/core#Concept"
                    if (self.displayMode == "centralPanelDiv") {
                        SourceEditor.editNode("Blender_nodeEditionContainerDiv", self.currentSource, self.currentTreeNode.data.id, skosType, false)
                    } else {
                        self.nodeEdition.openDialog()
                        SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, self.currentTreeNode.data.id, skosType, false)
                    }

                } else if (type == "collection") {
                    self.nodeEdition.openDialog()
                    var type = "http://www.w3.org/2004/02/skos/core#Collection"
                    SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, Collection.currentTreeNode.data.id, type, false)
                }

                return true;


            }


            , createChildNode: function (initData, type) {
                if (!initData)
                    initData = {}
                var parentNode;
                var parentProperty;
                var mandatoryProps;
                var childClass;
                var treeDivId;


                if (type == "concept") {
                    parentNode = self.currentTreeNode;
                    parentProperty = OwlSchema.currentSourceSchema.newObject.treeParentProperty;
                    mandatoryProps = OwlSchema.currentSourceSchema.newObject.mandatoryProperties;
                    //childClass = OwlSchema.currentSourceSchema.newObject.treeChildrenClasses[parentNode.data.type];
                    treeDivId = 'Blender_conceptTreeDiv';
                    type = "http://www.w3.org/2004/02/skos/core#Concept"
                    if (self.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#ConceptScheme")
                        initData["http://www.w3.org/2004/02/skos/core#topConceptOf"] = [{value: self.currentTreeNode.data.id, type: "uri"}]
                    if (self.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#Concept")
                        initData["http://www.w3.org/2004/02/skos/core#broader"] = [{value: self.currentTreeNode.data.id, type: "uri"}]

                } else if (type == "collection") {
                    parentNode = Collection.currentTreeNode;
                    var type = "http://www.w3.org/2004/02/skos/core#Collection"
                    parentProperty = "^" + Collection.broaderProperty;
                    mandatoryProps = ["http://www.w3.org/2004/02/skos/core#prefLabel"]
                    childClass = "http://www.w3.org/2004/02/skos/core#Collection";
                    treeDivId = 'Blender_collectionTreeDiv';
                }

                mandatoryProps.forEach(function (item) {
                    if (!initData[item])
                        initData[item] = [{"xml:lang": SourceEditor.prefLang, value: "", type: "literal"}]
                })
                initData[parentProperty] = [{value: parentNode.data.id, type: "uri"}];


                if (self.displayMode == "centralPanelDiv") {

                    SourceEditor.editNode("Blender_nodeEditionContainerDiv", self.currentSource, type, initData);
                } else {
                    self.nodeEdition.openDialog()
                    SourceEditor.editNewObject("Blender_nodeEditionDiv", self.currentSource, type, initData);


                }

            },


            openDialog: function () {
                $("#Blender_PopupEditDiv").dialog("open")

                /*  $(".ui-dialog-titlebar-close").css("display", "none")*/
                $("#Blender_PopupEditButtonsDiv").css("display", "block")

            },

            saveEditingNode: function () {
                SourceEditor.saveEditingObject(function (err, editingObject) {
                    if (err) {
                        MainController.UI.message(err)
                    }
                    $("#Blender_nodeEditionButtonsDiv").css("display", "none")
                    $("#Blender_nodeEditionContainerDiv").html("")

                    if (self.nodeEdition.processEditingErrors(editingObject)) {
                     /*   if (editingObject.isNew) {
                            var jstreeData = {
                                id: editingObject.about,
                                text: editingObject.nodeLabel,
                                parent: ThesaurusBrowser.currentTreeNode.id,
                                data: {
                                    id: editingObject.about,
                                    label: editingObject.nodeLabel,
                                    source: ThesaurusBrowser.currentTreeNode.data.source
                                }

                            }
                            common.addNodesToJstree(ThesaurusBrowser.currentTargetDiv, ThesaurusBrowser.currentTreeNode.id, jstreeData)

                        } else {

                            var node = $("#" + ThesaurusBrowser.currentTargetDiv).jstree(true).get_node(editingObject.about)
                            var newLabel = editingObject.nodeLabel
                            if (newLabel != node.text)
                                $("#" + ThesaurusBrowser.currentTargetDiv).jstree(true).rename_node(editingObject.about, newLabel)
                            $("#" + ThesaurusBrowser.currentTargetDiv).jstree(true).open_node(editingObject.about)
                        }*/
                        $("#Blender_PopupEditDiv").dialog("close")

                    } else {

                    }
                })
            }
            ,


            processEditingErrors: function (editingObject) {

                if (editingObject.errors && editingObject.errors.length > 0) {
                    var errorsStr = ""
                    editingObject.errors.forEach(function (item) {
                        errorsStr += item + "."
                    })
                    alert(errorsStr)
                    return false;
                }


                var treeDiv, currentNodeId;
                currentNodeId = "#"

                if (editingObject.type.indexOf("Concept") > 0) {
                    treeDiv = 'Blender_conceptTreeDiv'
                    if (Blender.currentTreeNode)
                        currentNodeId = Blender.currentTreeNode.data.id

                }
                if (editingObject.type.indexOf("Collection") > 0) {
                    treeDiv = 'Blender_collectionTreeDiv'
                    if (Collection.currentTreeNode)
                        currentNodeId = Collection.currentTreeNode.data.id

                }

                var parent = editingObject.parent || "#"
                if (editingObject.isNew) {
                    editingObject.isNew = false;
                    var jsTreeData = [{
                        id: editingObject.about,
                        text: editingObject.nodeLabel,
                        parent: currentNodeId,
                        data: {type: editingObject.type}
                    }]


                    var parentNode = $("#" + treeDiv).jstree(true).get_selected(true)[0]
                    if (parentNode) {
                        common.addNodesToJstree(treeDiv, parentNode, jsTreeData, {})
                      //  $("#" + treeDiv).jstree(true).open_node(currentNodeId);
                    } else {
                        common.loadJsTree("#" + treeDiv, jsTreeData, null)
                     //  $("#" + treeDiv).jstree(true).open_node("#");
                    }


                } else {
                    if (editingObject.nodeLabel) {
                        var nodeJstreeId = $("#" + treeDiv).jstree(true).get_selected()[0]

                        $("#" + treeDiv).jstree(true).rename_node(nodeJstreeId, editingObject.nodeLabel)
                     /*   var parentNodeId = $("#" + treeDiv).jstree(true).get_selected(true)[0]
                        parentNodeId=parentNodeId.parent
                        $("#" + treeDiv).jstree(true).refresh_node(parentNodeId)*/

                        common.setTreeAppearance();
                    }
                }
                return true;

            }
            , cancelEditingNode: function () {
                $("#Blender_PopupEditDiv").dialog("close")
            }

        }


        self.searchTerm = function () {

            "Blender_conceptTreeDiv"
        }


        return self;

    }
    ()
)
