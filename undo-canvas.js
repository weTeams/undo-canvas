(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.UndoCanvas = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function undo(step=1){if(step<1)return;let redoNo=this._undodata.current.no-step;redoNo<0&&(redoNo=0);const cp=getLatestCheckpoint(this,redoNo);cp.apply(this),this._undodata.current=cp.redo;let redo=cp.redo.next;for(;redo&&redo.no<=redoNo;)redo.apply(this),this._undodata.current=redo,redo=redo.next}function redo(step=1){if(step<1)return;let redoNo=this._undodata.current.no+step;const latestNo=this._undodata.redos[this._undodata.redos.length-1].no;redoNo>latestNo&&(redoNo=latestNo);const currentCp=getLatestCheckpoint(this,this._undodata.current.no);let redo=this._undodata.current;const cp=getLatestCheckpoint(this,redoNo);for(currentCp!==cp&&(cp.apply(this),redo=cp.redo);redo&&redo.no<=redoNo;)redo.apply(this),this._undodata.current=redo,redo=redo.next}function undoTag(name=/.*/,step=1){if(step<1)return null;const current=this._undodata.current;let tags,index=(tags=name instanceof RegExp?this._undodata.tags.filter(tag=>tag.no<current&&name.test(tag.name)):this._undodata.tags.filter(tag=>tag.no<current&&tag.name==name)).length-step;return index<0?null:tags[index]}function redoTag(name=/.*/,step=1){if(step<1)return null;const current=this._undodata.current;let tags;return(tags=name instanceof RegExp?this._undodata.tags.filter(tag=>tag.no>current&&name.test(tag.name)):this._undodata.tags.filter(tag=>tag.no>current&&tag.name==name))[step-1]}function putTag(name=""){this._undodata.tags.push({no:getLatestRedo(this).no,name:name})}function getLatestCheckpoint(obj,no){const cps=obj._undodata.checkpoints;for(let i=cps.length-1;i>=0;i--){const cp=cps[i];if(cp.redo.no<=no)return cp}return null}function getLatestRedo(obj){const redoLen=obj._undodata.redos.length;return obj._undodata.redos[redoLen-1]}function deleteFutureData(obj){const current=obj._undodata.current,currentNo=current.no,numRedos=getLatestRedo(obj).no-current.no;numRedos&&(obj._undodata.redos.length=obj._undodata.redos.length-numRedos),current.next=null;const checkpoints=obj._undodata.checkpoints;let i=checkpoints.length-1;for(;i>=0&&!(checkpoints[i].redo.no<=currentNo);i--);checkpoints.length=i+1;const tags=obj._undodata.tags;for(i=tags.length-1;i>=0&&!(tags[i].no<=currentNo);i--);tags.length=i+1}function addCommand(obj,command){obj._undodata.commands.push(command)}function addRedo(obj,redoLog){const current=obj._undodata.current;if(redoLog.no=current.no+1,current.next=redoLog,obj._undodata.redos.push(redoLog),obj._undodata.current=redoLog,obj._undodata.cost+=redoLog.cost,obj._undodata.cost>obj._undodata.cpThreshold){console.log("CheckPoint: cost: "+obj._undodata.cost);const cp=new CheckPoint(obj,redoLog);obj._undodata.checkpoints.push(cp),obj._undodata.cost=0}}function recordCommand(obj,func,args){deleteFutureData(obj);const cost=commandCost[func.name]||1;addCommand(obj,new CommandLog(func,args,cost))}function commit(obj){const redoLog=new RedoLog(obj._undodata.commands);obj._undodata.commands=[],addRedo(obj,redoLog)}function hookAccessor(obj,propertyName){const desc=Object.getOwnPropertyDescriptor(obj.constructor.prototype,propertyName);Object.defineProperty(obj,propertyName,{set:newValue=>{recordCommand(obj,desc.set,[newValue]),desc.set.bind(obj)(newValue)},get:desc.get?desc.get.bind(obj):()=>{},enumerable:!0,configurable:!0})}function hookFunction(obj,propertyName,needsCommit){const desc=Object.getOwnPropertyDescriptor(obj.constructor.prototype,propertyName),orgFunc=desc.value.bind(obj);obj[propertyName]=((...args)=>{recordCommand(obj,desc.value,args),needsCommit&&commit(obj),orgFunc(...args)})}function hook(obj,propertyName,needsCommit){const desc=Object.getOwnPropertyDescriptor(obj.constructor.prototype,propertyName);void 0!==desc&&(desc.configurable?void 0!==desc.set?hookAccessor(obj,propertyName,desc):void 0!==desc.get||hookFunction(obj,propertyName,needsCommit):console.error(propertyName+" is not configurable"))}function isContext2D(context){return context instanceof CanvasRenderingContext2D}function addUndoProperties(context){context.undo=undo.bind(context),context.redo=redo.bind(context),context.undoTag=undoTag.bind(context),context.redoTag=redoTag.bind(context),context.putTag=putTag.bind(context);const redoLog=new RedoLog([],0),data={checkpoints:[new CheckPoint(context,redoLog)],redos:[redoLog],tags:[],current:redoLog,commands:[],cost:0,cpThreshold:5e3};Object.defineProperty(context,"_undodata",{enumerable:!1,configurable:!0,value:data})}function deleteUndoProperties(context){delete context.undo,delete context.redo,delete context.undoTag,delete context.redoTag,delete context.putTag,delete context._undodata}function enableUndo(context,options={}){if(!isContext2D(context))throw"enableUndo: context is not instance of CanvasRenderingContext2D";const names=Object.getOwnPropertyNames(context.constructor.prototype);for(const name of names)-1===ignoreTriggers.indexOf(name)&&hook(context,name,commitTriggers.indexOf(name)>=0);addUndoProperties(context)}function disableUndo(context){if(!isContext2D(context))throw"disableUndo: context is not instance of CanvasRenderingContext2D";deleteUndoProperties(context),resetObject(context)}const resetObject=require("reset-object"),ignoreTriggers=["canvas","constructor","createImageData","createLinearGradient","createPattern","createRadialGradient","getImageData","getLineDash","isPointInPath","isPointInStroke","measureText","scrollPathIntoView"],commitTriggers=["clearRect","drawFocusIfNeeded","drawImage","fill","fillRect","fillText","putImageData","stroke","strokeRect","strokeText"];class CheckPoint{constructor(context,redo){this.parameters=null,this.imageData=null,this.redo=redo,this.getContextParameters(context),this.getImageData(context)}getImageData(context){const prop=Object.getOwnPropertyDescriptor(context.constructor.prototype,"getImageData");this.imageData=prop.value.bind(context)(0,0,context.canvas.width,context.canvas.height)}putImageData(context){context.canvas.width=this.imageData.width,context.canvas.height=this.imageData.height,Object.getOwnPropertyDescriptor(context.constructor.prototype,"putImageData").value.bind(context)(this.imageData,0,0)}getContextParameters(context){const names=Object.getOwnPropertyNames(context.constructor.prototype),params={};for(const name of names){if(-1!==ignoreTriggers.indexOf(name))continue;const prop=Object.getOwnPropertyDescriptor(context.constructor.prototype,name);prop.get&&prop.set&&(params[name]=prop.get.bind(context)())}this.parameters=params}setContextParameters(context){const src=this.parameters,keys=Object.keys(src);for(const key of keys)Object.getOwnPropertyDescriptor(context.constructor.prototype,key).set.bind(context)(src[key])}apply(context){this.putImageData(context),this.setContextParameters(context),context._undodata.cost=0}}class RedoLog{constructor(commands=[],no=null){this.no=no,this.commands=commands,this.cost=this.calcCost()}apply(context){for(const command of this.commands)command.apply(context);context._undodata.cost+=this.cost}calcCost(){let cost=0;for(const command of this.commands)cost+=command.cost;return cost}}class CommandLog{constructor(func,args,cost=1){this.func=func,this.args=args,this.cost=cost}apply(context){this.func.bind(context)(...this.args)}}const commandCost={putImageData:1e3,drawImage:1e3};module.exports={enableUndo:enableUndo,disableUndo:disableUndo};

},{"reset-object":2}],2:[function(require,module,exports){
function setValues(src, dst, finishedKeys) {
  const keys = Object.getOwnPropertyNames(src)
  for(const key of keys){
    if(finishedKeys.indexOf(key) >= 0){
      continue
    }
    finishedKeys.push(key)
    const dstProp = Object.getOwnPropertyDescriptor(dst, key)
    if(typeof dstProp !== 'undefined' && !dstProp.configurable){
      continue
    }
    const srcProp = Object.getOwnPropertyDescriptor(src, key)
    if(typeof srcProp.get !== 'undefined' || typeof srcProp.set !== 'undefined'){
      Object.defineProperty(dst, key, srcProp)
    }else if(typeof src[key] === 'function'){
      Object.defineProperty(dst, key, srcProp)
    }else{
      srcProp.value = dst[key]
      Object.defineProperty(dst, key, srcProp)
    }
  }
}

function resetObject(obj) {
  if(typeof obj.constructor === 'undefined'){
    throw 'resetObject: obj is not an instance object'
  }
  if(Object.isSealed(obj)){
    throw 'resetObject: obj is sealed'
  }
  let p = obj.constructor.prototype
  let finishedKeys = []
  while(p){
    setValues(p, obj, finishedKeys)
    p = Object.getPrototypeOf(p)

    if(p.constructor === Object){
      break
    }
  }
}

module.exports = resetObject

},{}]},{},[1])(1)
});