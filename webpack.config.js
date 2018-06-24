const webpack = require('webpack')
const path = require('path')

module.exports = {
  module: {
    rules: [{
      exclude: /(node_modules|bower_components)/,
      test: /\.js$/,
      include: __dirname,
      loader: 'babel-loader'
    }]
  },

  entry: {
    ans2png: "./index.js"
  },

  // mode: "development",

  optimization: {
    minimize: false
  },
  
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: ['Ans2png']
  }
}