import test from 'node:test';import assert from 'node:assert/strict';import {mapCoverCrop,GUIDE_CENTERS} from '../camera.js';
test('guided crop maps a landscape overlay into the visible cover area',()=>{
 const crop=mapCoverCrop(1920,1080,{left:0,top:0,width:800,height:600},{left:40,top:90,width:720,height:405});
 assert.ok(crop.x>=0&&crop.y>=0);assert.ok(crop.width>1000&&crop.height>600);assert.equal(GUIDE_CENTERS.length,5);
});
test('guided crop maps portrait camera cover without leaving source bounds',()=>{
 const crop=mapCoverCrop(1080,1920,{left:0,top:0,width:400,height:800},{left:20,top:220,width:360,height:360});
 assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=1081&&crop.y+crop.height<=1921);
});
