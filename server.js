const express = require('express');

const app = express();

app.use(express.static('public'));

// URL's
app.get('/img/:w/:h', img);

function img(req, res){
    res.send("success");
}

console.log(process.env.PORT || 8080);

app.listen(process.env.PORT || 8080);