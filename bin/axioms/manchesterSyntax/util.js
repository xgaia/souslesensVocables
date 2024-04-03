
var literalNames = [ null, "'>'", "'<'", "'>='", "'<='", "'('", "')'",
    null, "'Prefix'", "'Class'", "'Individual'",
    "'Property'", "'ObjectProperty'", "'Types'",
    "'Facts'", "'SubClassOf'", "'EquivalentTo'",
    "'DisjointWith'", "'and'", "'or'", "'not'",
    "'some'", "'only'", "'min'", "'max'", "'exactly'",
    "'value'", "'Domain'", "'Range'" ];
var symbolicNames = [ null, null, null, null, null, null, null, "WS",
    "KW_PREFIX", "KW_CLASS", "KW_INDIVIDUAL", "KW_PROPERTY",
    "KW_OBJECTPROPERTY", "KW_TYPES", "KW_FACTS",
    "KW_SUBCLASSOF", "KW_EQUIVALENTTO", "KW_DISJOINTWITH",
    "KW_AND", "KW_OR", "KW_NOT", "KW_SOME", "KW_ONLY",
    "KW_MIN", "KW_MAX", "KW_EXACTLY", "KW_VALUE",
    "KW_DOMAIN", "KW_RANGE", "STRING", "ID", "BOOLEAN",
    "INT" ];
var ruleNames = [ "comparisonOperator", "prefixAxiom", "classAxiom",
    "subclassAxiom", "equivalentClassAxiom", "disjointAxiom",
    "conjunctionAxiom", "disjunctionAxiom", "negationAxiom",
    "propertyAxiom", "objectpropertyaxiom", "classExpression",
    "individualAxiom", "typeSection", "factsSection",
    "propertySection", "v", "lexerError", "parserError",
    "axiom" ];



var terms= {
    "'>'": "'>'",
    "'<'": "'<'",
    "'>='": "'>='",
    "'<='": "'<='",
    "'('": "'('",
    "')'": "')'",
    "'prefix'": "'Prefix'",
    "'class'": "'Class'",
    "'individual'": "'Individual'",
    "'property'": "'Property'",
    "'objectproperty'": "'ObjectProperty'",
    "'types'": "'Types'",
    "'facts'": "'Facts'",
    "'subclassof'": "'SubClassOf'",
    "'equivalentto'": "'EquivalentTo'",
    "'disjointwith'": "'DisjointWith'",
    "'and'": "'and'",
    "'or'": "'or'",
    "'not'": "'not'",
    "'some'": "'some'",
    "'only'": "'only'",
    "'min'": "'min'",
    "'max'": "'max'",
    "'exactly'": "'exactly'",
    "'value'": "'value'",
    "'domain'": "'Domain'",
    "'range'": "'Range'",
    "ws": "WS",
    "kw_prefix": "KW_PREFIX",
    "kw_class": "KW_CLASS",
    "kw_individual": "KW_INDIVIDUAL",
    "kw_property": "KW_PROPERTY",
    "kw_objectproperty": "KW_OBJECTPROPERTY",
    "kw_types": "KW_TYPES",
    "kw_facts": "KW_FACTS",
    "kw_subclassof": "KW_SUBCLASSOF",
    "kw_equivalentto": "KW_EQUIVALENTTO",
    "kw_disjointwith": "KW_DISJOINTWITH",
    "kw_and": "KW_AND",
    "kw_or": "KW_OR",
    "kw_not": "KW_NOT",
    "kw_some": "KW_SOME",
    "kw_only": "KW_ONLY",
    "kw_min": "KW_MIN",
    "kw_max": "KW_MAX",
    "kw_exactly": "KW_EXACTLY",
    "kw_value": "KW_VALUE",
    "kw_domain": "KW_DOMAIN",
    "kw_range": "KW_RANGE",
    "string": "STRING",
    "id": "ID",
    "boolean": "BOOLEAN",
    "int": "INT",
    "comparisonoperator": "comparisonOperator",
    "prefixaxiom": "prefixAxiom",
    "classaxiom": "classAxiom",
    "subclassaxiom": "subclassAxiom",
    "equivalentclassaxiom": "equivalentClassAxiom",
    "disjointaxiom": "disjointAxiom",
    "conjunctionaxiom": "conjunctionAxiom",
    "disjunctionaxiom": "disjunctionAxiom",
    "negationaxiom": "negationAxiom",
    "propertyaxiom": "propertyAxiom",
    "objectpropertyaxiom": "objectpropertyaxiom",
    "classexpression": "classExpression",
    "individualaxiom": "individualAxiom",
    "typesection": "typeSection",
    "factssection": "factsSection",
    "propertysection": "propertySection",
    "v": "v",
    "lexererror": "lexerError",
    "parsererror": "parserError",
    "axiom": "axiom" }

function setMap(array){
    array.forEach(function(term){
        if(term)
        terms[term.toLowerCase().replace("kw_","")]=term;
    })

}

setMap(literalNames)
//setMap(symbolicNames)
//setMap(ruleNames)
//var x=terms




