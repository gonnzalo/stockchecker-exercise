/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

const fetch = require("node-fetch");

require("dotenv").config();

module.exports = (app, collection) => {
  app
    .route("/api/stock-prices")

    .get((req, res) => {
      const { stock } = req.query;
      const like = req.query.like ? 1 : 0;
      const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

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
            // { $and: [ { stock: stocksArray[0].stock }, { stock: stocksArray[1].stock } } ] }
            collection
              .find({
                stock: { $in: [stocksArray[0].stock, stocksArray[1].stock] }
              })
              .toArray((err, result) => {
                const likeOne = result[0].like.length - 1;
                const likeTwo = result[1].like.length - 1;
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
                });
              });
          }
        })
        .catch(error => console.log(error));
    });
};
