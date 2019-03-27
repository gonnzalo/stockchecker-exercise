/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

const { expect } = require("chai");
const { MongoClient } = require("mongodb");
const fetch = require("node-fetch");
const Bluebird = require("bluebird");
require("dotenv").config();

fetch.Promise = Bluebird;

const CONNECTION_STRING = process.env.DB;
// const client = new MongoClient(CONNECTION_STRING , { useNewUrlParser: true});
//     client.connect(err => {
//     const collection = client.db("test").collection("stock")

//  client.close();

//     });

// MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true} , function(err, client) {
//   if(!err) {
//     console.log("We are connected");
//     const collection = client.db("test").collection("stock")
//   }
// });
// const mongoose = require("mongoose");

// mongoose.connect(CONNECTION_STRING, {
//   useNewUrlParser: true,
// });
// mongoose.Promise = global.Promise;
// const db  = mongoose.connection;
// db.once("open", () => {
//   console.log("connected");

// });
// db.on("error", console.error.bind(console, "connection error:"));

module.exports = app => {
  app
    .route("/api/stock-prices")

    .get((req, res) => {
      MongoClient.connect(
        CONNECTION_STRING,
        { useNewUrlParser: true },
        (err, client) => {
          if (!err) {
            console.log("We are connected");
            const collection = client.db("test").collection("stock");

            const { stock } = req.query;
            const like = req.query.like ? 1 : 0;
            const ip =
              req.headers["x-forwarded-for"] || req.connection.remoteAddress;

            fetch(
              `https://api.iextrading.com/1.0/stock/market/batch?symbols=${
                Array.isArray(stock) ? `${stock[0]},${stock[1]}` : stock
              }&types=price`,
              { method: "GET" }
            )
              .then(response => {
                return response.json();
              })
              .then(stocks => {
                // unique ip with like
                const uip = like ? ip : 0;
                const stocksArray = Object.keys(stocks).map(key => {
                  collection.findOneAndUpdate(
                    { stock: key.toUpperCase() },
                    {
                      $set: { stock: key.toUpperCase() },
                      $addToSet: { like: [{ [uip]: like }] }
                    },
                    { upsert: true },
                    (err, doc) => {
                      if (err) console.log(err);
                    }
                  );
                  return {
                    stock: key.toUpperCase(),
                    price: stocks[key].price.toString(),
                    likes: like
                  };
                });

                if (stocksArray.length < 2) {
                  res.json({ stockData: stocksArray[0] });
                } else {
                  let likeOne = 0;
                  let likeTwo = 0;

                  collection
                    .findOne({ stock: stocksArray[0].stock })
                    .then(items => {
                      likeOne = items.like.length - 1;
                    })
                    .then(() =>
                      collection.findOne({ stock: stocksArray[1].stock })
                    )
                    .then(items => {
                      likeTwo = items.like.length - 1;
                    })
                    .then(() =>
                      res.json({
                        stockData: [
                          {
                            stock: stocksArray[0].stock,
                            price: stocksArray[0].price,
                            rel_likes: likeOne - likeTwo
                          },
                          {
                            stock: stocksArray[1].stock,
                            price: stocksArray[1].price,
                            rel_likes: likeTwo - likeOne
                          }
                        ]
                      })
                    )
                    .catch(err => console.log(err));
                }
              })
              .catch(error => console.log(error));
          }
        }
      );
    });
};
