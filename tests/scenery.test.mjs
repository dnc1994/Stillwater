import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {generateWorld,WorldStreamer} from '../dist/world.js';
// Resolve the browser import map for a DOM-free geometry lifecycle test.
const source=(await readFile(new URL('../dist/scenery.js',import.meta.url),'utf8')).replace("from 'three'",`from '${new URL('../dist/vendor/three.module.js',import.meta.url).href}'`).replace("from './world.js'",`from '${new URL('../dist/world.js',import.meta.url).href}'`);
const {createScenery}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const world=generateWorld('geometry-check'),material=new THREE.MeshStandardMaterial(),scene=new THREE.Scene();
const scenery=createScenery(world,{earth:material,bark:material,stone:material,wood:material},new THREE.Group());
let terrainDisposals=0,instanceDisposals=0;
const streamer=new WorldStreamer(world,data=>{const item=scenery.build(data);scene.add(item.group);item.group.traverse(o=>{
 if(o.isInstancedMesh){assert.ok(Number.isFinite(o.boundingSphere.radius),'Finite instance bounds');o.addEventListener('dispose',()=>instanceDisposals++);}
 else if(o.geometry?.type==='BufferGeometry'){const positions=o.geometry.attributes.position.array;assert.ok(positions.every(Number.isFinite),'Finite terrain');o.geometry.addEventListener('dispose',()=>terrainDisposals++);}
});return item;},item=>scenery.dispose(item));
streamer.update(0,0,25);assert.equal(scene.children.length,25);
streamer.update(5000,-5000,25);assert.equal(scene.children.length,25);assert.ok(terrainDisposals>0);assert.ok(instanceDisposals>0);
streamer.clear();assert.equal(scene.children.length,0);
console.log('Geometry lifecycle passed: two streamed windows, finite terrain/bounds, chunk removal and GPU-buffer disposal events.');
