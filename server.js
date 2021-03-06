const express = require("express");
const bodyParser = require("body-parser");
const { expect } = require("chai");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const { MongoClient } = require("mongodb");

const apiRoutes = require("./routes/api.js");
const fccTestingRoutes = require("./routes/fcctesting.js");
const runner = require("./test-runner");

const app = express();

// app.use(helmet.contentSecurityPolicy({
//   directives: {
//     defaultSrc: ["'self'", "'code.jquery.com'"],
//     scriptSrc: ["'self'", "'code.jquery.com'"],
//     styleSrc: ["'self'"]
//   }
// }))

app.use("/public", express.static(`${process.cwd()}/public`));

app.use(cors({ origin: "*" })); // For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Index page (static HTML)
app.route("/").get(function(req, res) {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

// For FCC testing purposes
fccTestingRoutes(app);

// Routing for API
const CONNECTION_STRING = process.env.DB;
MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true }, function(
  err,
  client
) {
  if (!err) {
    const collection = client.db("test").collection("stock");

    apiRoutes(app, collection);

    // 404 Not Found Middleware
    app.use(function(req, res, next) {
      res
        .status(404)
        .type("text")
        .send("Not Found");
    });
  }
});

// Start our server and tests!
app.listen(process.env.PORT || 3000, function() {
  console.log(`Listening on port ${process.env.PORT}`);
  if (process.env.NODE_ENV === "test") {
    console.log("Running Tests...");
    setTimeout(function() {
      try {
        runner.run();
      } catch (e) {
        const error = e;
        console.log("Tests are not valid:");
        console.log(error);
      }
    }, 3500);
  }
});

module.exports = app; // for testing
