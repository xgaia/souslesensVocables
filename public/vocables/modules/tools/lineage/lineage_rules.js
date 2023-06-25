import Lineage_sources from "./lineage_sources.js";
import SearchWidget from "../../uiWidgets/searchWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";


var Lineage_rules = (function() {
  var self = {};

  self.premiseDivs = {};

  self.showRulesDialog = function() {
    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").load("snippets/lineage/lineage_rulesDialog.html", function() {
      $("#lineage_rules_searchClassInput").bind("keydown", null, Lineage_rules.onSearchClassKeyDown);
      $("#lineage_rules_searchPropertyInput").bind("keydown", null, Lineage_rules.onSearchPropertyKeyDown);
    });
  };
  self.onSearchClassKeyDown = function(event) {
    if (event.keyCode != 13 && event.keyCode != 9) {
      return;
    }
    var term = $("#lineage_rules_searchClassInput").val();
    self.searchItem(term, "class");
  };

  self.onSearchPropertyKeyDown = function(event) {
    if (event.keyCode != 13 && event.keyCode != 9) {
      return;
    }
    var term = $("#lineage_rules_searchClassInput").val();
    self.searchItem(term, "property");
  };

  self.searchItem = function(term, type) {
    term = term.replace("*", "");
    var filter = "filter (regex(?label,'" + term + "','i')"
    if( type=="class")
      filter+="  && ?type=owl:Class)";
    else if( type="property")
      filter+="  && ?type=owl:ObjectProperty)";
    Sparql_OWL.getDictionary(Lineage_sources.activeSource, { filter: filter, selectGraph: 1 }, null, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      var jstreeData = [];
      result.forEach(function(item) {
        jstreeData.push({
          id: item.id.value,
          text: item.label.value,
          parent: "#",
          data: {
            id: item.id.value,
            label: item.label.value,
            source: Sparql_common.getSourceFromGraphUri(item.g.value),
            type:type
          }

        });
      });


      var options = {
        selectTreeNodeFn: Lineage_rules.selectTreeNodeFn,
        contextMenu: Lineage_rules.getContextMenu()
      };
      JstreeWidget.loadJsTree("lineage_rules_searchJsTreeDiv", jstreeData, options);

    });

  };

  self.getContextMenu = function() {
    var items = {};


    items.AddPremise = {
      label: "Add Premise",
      action: function(_e, _xx) {
        self.addPremise(self.currentTreeNode);
      }
    };
 /*   items.seToNode = {
      label: "List  properties",
      action: function(_e, _xx) {
        self.addPropertiesToTree(self.currentTreeNode);
      }
    };*/

    return items;
  };
  self.selectTreeNodeFn = function(event, obj) {
    self.currentTreeNode = obj.node;


  };


  self.addPremise = function(node) {
    self.premiseDivs[premiseDivId] = node;
    var premiseDivId = "premise_" + common.getRandomHexaId(5);
    var html = "<div class='lineage_rules_premise lineage_rules_premise_"+node.data.type+"' id='" + premiseDivId + "'>" +
      "<span>" + node.data.label + " </span>" +
      "<button onclick='Lineage_rules.clearPremise(\"" + premiseDivId + "\")'>X</bbutton>";
    $("#lineage_rules_premisesDiv").append(html);
  };

  self.clearPremise = function(div) {
    delete self.premiseDivs[div];
    $("#" + div).remove();

  };


  self.addPropertiesToTree = function(node) {
    Sparql_OWL.getFilteredTriples(node.data.source, node.data.id, null, null, null, function(err, result) {
      if (err) {
        alert(err.responseText);
      }
      var jstreeData = [];
      result.forEach(function(item) {
        var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.propValue);
        jstreeData.push({
          id: item.prop.value,
          text: propLabel,
          parent: node.id,
          data: {
            id: item.prop.value,
            data: propLabel,
            source: self.currentTreeNode.data.source
          }

        });
        JstreeWidget.addNodesToJstree("lineage_rules_searchJsTreeDiv", node.id, jstreeData);

      });

    });
  };

  /*

    self.addNodeToGraph=function(){



      //draw graph
      if (options.addToGraph && self.axiomsVisjsGraph) {
          self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
          self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
      } else {
          self.drawGraph(visjsData);
      }

};

self.drawGraph = function (visjsData) {
    var xOffset = 60;
    var yOffset = 130;
    xOffset = parseInt($("#axiomsDraw_xOffset").val());
    yOffset = parseInt($("#axiomsDraw_yOffset").val());
    var options = {
        keepNodePositionOnDrag: true,

        layoutHierarchical: {
            direction: "LR",
            sortMethod: "hubsize",
            //  sortMethod:"directed",
            //    shakeTowards:"roots",
            //  sortMethod:"directed",
            levelSeparation: xOffset,
            parentCentralization: true,
            shakeTowards: true,
            blockShifting: true,

            nodeSpacing: yOffset,
        },
        edges: {
            smooth: {
                // type: "cubicBezier",
                type: "diagonalCross",
                forceDirection: "horizontal",

                roundness: 0.4,
            },
        },
        onclickFn: Lineage_axioms_draw.onNodeClick,
        onRightClickFn: Lineage_axioms_draw.showGraphPopupMenu,
        onHoverNodeFn: Lineage_axioms_draw.selectNodesOnHover,
    };

    var graphDivContainer = "axiomsGraphDivContainer";
    $("#" + graphDivContainer).html("<div id='axiomsGraphDiv' style='width:100%;height:100%' onclick='MainController.UI.hidePopup(\"axioms_graphPopupDiv\")';></div>");
    self.axiomsVisjsGraph = new VisjsGraphClass("axiomsGraphDiv", visjsData, options);
    self.axiomsVisjsGraph.draw(function () {});
};

self.onNodeClick = function (node, point, nodeEvent) {

    self.currentGraphNode = node;
    if (nodeEvent.ctrlKey && nodeEvent.shiftKey) {
        var options = { addToGraph: 1, level: self.currentGraphNode.level };
        return self.drawNodeAxioms(self.context.sourceLabel, self.currentGraphNode.data.id, self.context.divId, 2, options);
    }

    if (!node) {
        return $("#nodeInfosWidget_HoverDiv").css("display", "none");
    } else {
        self.currentGraphNode = node;
    }

    self.showNodeInfos(node, point, options);
};

*/


  return self;
})();
export default Lineage_rules;
window.Lineage_rules = Lineage_rules;
