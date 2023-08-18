const express = require('express');
const { sendImage } = require('./imager/imager');

let recentPaths = [];
let recentTexts = [];
let recentSizes = [];
let topSizes = {};
let topReferers = {};
let hitCounts = Array(15).fill(0);

const app = express();

app.use(express.static('public'));

// URL's
app.get('/img/:w/:h?', serveImg);
app.get('/stats/paths/recent', (req, res)=> getRecentStat(res, recentPaths));
app.get('/stats/texts/recent', (req, res)=> getRecentStat(res, recentTexts))
app.get('/stats/sizes/recent', (req, res)=> getRecentStat(res, recentSizes))
app.get('/stats/sizes/top', (req, res)=> getTopStat(res, topSizes))
app.get('/stats/referrers/top', (req, res)=> getTopStat(res, topReferers))
app.get('/stats/hits', (req, res)=> getHits(res, hitCounts))
app.delete('/stats', deleteStats);

function formatImgURL(w, h, s, t){
    let params = [];
    let pathString = '';
    if (s) params.push(`square=${s}`);
    if (t) params.push(`text=${encodeURIComponent(t)}`);
    if (params.length) pathString = '?' + params.join('&'); 
    return `/img/${w}/${h + pathString}`;
}

function addStats(arr, value, array){
    if (typeof value === 'string') arr = arr.filter((item) => item != value);
    else arr = arr.filter((item) => (item?.w != value?.w || item?.h != value?.h));
    arr.unshift(value)
    if (arr.length > 10) arr.length = 10;
    return arr;
}

function updateTop(obj, w, h){
    const size = w+'x'+h;
    if (!(obj.hasOwnProperty(size))){
        obj[size] = {w, h, n:0};
    }
    obj[size].n += 1;
    return obj;
}

function updateStats(w, h, s, t, ref){
    // Saves the most recent 10 unique paths
    let path = formatImgURL(w, h, s, t);
    recentPaths = addStats(recentPaths, path);

    // Saves the most recent 10 unique image texts
    if (t) recentTexts = addStats(recentTexts, t, 'recentTexts');

    // Saves the most recentn 10 unique sizes
    recentSizes = addStats(recentSizes, {w, h}, 'recentSizes');

    topSizes = updateTop(topSizes, w, h);

    if (ref){
        if (!(ref in topReferers)) {
            topReferers[ref] = {ref, n:0};
        }
        topReferers[ref].n += 1;
    }


    hitCounts[0] += 1;

}

function updateHitCount(){
    hitCounts.unshift(0);
    hitCounts.pop();
}

setInterval(updateHitCount, 1000)

function serveImg(req, res){
    const w = Number(req.params.w);
    const h = Number(req.params.h);
    const s = Number(req.query.square || 50);
    
    if (w > 2000 || h > 2000){
        res.status(403).send("width or height parameter exceeds max-limit");
        return;
    }

    if (!w || w < 0 || !h || h < 0 || !Number.isInteger(w) || !Number.isInteger(h) || !s || !Number.isInteger(s) || s < 0 || req.query.square === ""){
        res.status(400).send("Invalid query or path parameters");
        // res.sendStatus(400);
        return;
    }

    
    const t = req.query.text;

    updateStats(w, h, req.query.square, t, req.get('Referer'));
    
    sendImage(res, w, h, s, t);
    return;
}

function partition(arr, start, end){
    let pivotIndex = end;
    let secondPointer = start;
    for (let i=start; i < end; i++){
        if (arr[i].n > arr[pivotIndex].n){
            [arr[secondPointer], arr[i]] = [arr[i], arr[secondPointer]]
            secondPointer++;
        }
    }
    [arr[secondPointer], arr[pivotIndex]] = [arr[pivotIndex], arr[secondPointer]];
    return secondPointer;
}

function quickSort(arr, start, end){
    if (start < end){
        let partitionIndex = partition(arr, start, end);
        quickSort(arr, start, partitionIndex-1);
        quickSort(arr, partitionIndex + 1, end);
    }
    return arr;
}

function getRecentStat(res, stat){
    res.json(stat)
}

function getTopStat(res, stat){
    let payload = quickSort(Object.values(stat), 0, Object.values(stat).length-1);
    if (payload.length > 10) payload.length = 10;
    res.json(payload);
}

function getHits(res, stat){
    let s5 = stat.slice(0,5).reduce((prev, cur) => prev + cur);
    let s10 = stat.slice(0,10).reduce((prev, cur) => prev + cur);
    let s15 = stat.slice(0,15).reduce((prev, cur) => prev + cur);

    const payload = [
        {title: '5s', count: s5},
        {title: '10s', count: s10},
        {title: '15s', count: s15}
    ]

    res.json(payload);    
}

function deleteStats(req, res){
    recentPaths = [];
    recentTexts = [];
    recentSizes = [];
    topSizes = {};
    topReferers = {};
    hitCounts = Array(15).fill(0);
    res.sendStatus(200)
}

console.log(process.env.PORT || 8080);

app.listen(process.env.PORT || 8080);