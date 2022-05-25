var express = require("express");
var fs = require("fs");
var path = require("path");
var passport = require("passport");
require("./bin/authentication.");
var httpProxy = require("./bin/httpProxy.");
var RDF_IO = require("./bin/RDF_IO.");
var DataController = require("./bin/dataController.");
var DirContentAnnotator = require("./bin/annotator/dirContentAnnotator.");
var configManager = require("./bin/configManager.");
var CsvTripleBuilder = require("./bin/KG/CsvTripleBuilder.");
const { processResponse } = require("./api/v1/paths/utils");

const { config } = require(path.resolve("model/config"));

var router = express.Router();
var serverParams = { routesRootUrl: "" };

// ensureLoggedIn function
// TODO: Remove this when the API is moved to OpenAPI as OpenApi uses securityHandlers
// see : https://github.com/kogosoftwarellc/open-api/tree/master/packages/express-openapi#argssecurityhandlers
let ensureLoggedIn;
if (!config.disableAuth) {
    ensureLoggedIn = function ensureLoggedIn(_options) {
        config.auth == "keycloak" ? passport.authenticate("keycloak", { failureRedirect: "/login" }) : null;
        return function (req, res, next) {
            if (!req.isAuthenticated || !req.isAuthenticated()) {
                return res.redirect(401, "/login");
            }
            next();
        };
    };
} else {
    ensureLoggedIn = function ensureLoggedIn(_options) {
        return function (req, res, next) {
            next();
        };
    };
}

// Home (redirect to /vocables)
router.get("/", function (req, res, _next) {
    res.redirect("vocables");
});

// Login routes
if (!config.disableAuth) {
    if (config.auth == "keycloak") {
        router.get("/login", passport.authenticate("provider", { scope: ["openid", "email", "profile"] }));
        router.get("/login/callback", passport.authenticate("provider", { successRedirect: "/", failureRedirect: "/login" }));
    } else {
        router.get("/login", function (req, res, _next) {
            res.render("login", { title: "souslesensVocables - Login" });
        });
        router.post(
            "/auth/login",
            passport.authenticate("local", {
                successRedirect: "/vocables",
                failureRedirect: "/login",
                failureMessage: true,
            })
        );
    }
} else {
    router.get("/login", function (req, res, _next) {
        res.redirect("vocables");
    });
}

module.exports = router;
