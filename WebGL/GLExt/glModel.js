import { gl, getContentsFromFile, glPrintError } from "./glContext.js";
import { CShader, CShaderList } from "./glShader.js";
import { CTexture, CTextureList } from "./glTexture.js";
import * as vMath from "../glMatrix/gl-matrix.js";

/*
var RenderPrimitiveType = Object.freeze( {"POINTS":1,"LINES":2,"TRIANGLES":3,
										  "LINE_STRIP":4, "LINE_LOOP":5, "LINE_STRIP_ADJACENCY":6, "LINES_ADJACENCY":7,
										  "TRIANGLE_STRIP":8, "TRIANGLE_FAN":9, "TRIANGLE_STRIP_ADJACENCY":10, "TRIANGLES_ADJACENCY"11, "PATCHES":12});
*/

function getAsVector(vecNumComponents, Buffer, id){
	switch(vecNumComponents){
		case 1: return Buffer[id]; break;
		case 2: return vMath.vec2.fromValues( Buffer[id*2], Buffer[id*2+1]); break;
		case 3: return vMath.vec3.fromValues( Buffer[id*3], Buffer[id*3+1], Buffer[id*3+2]); break;
		case 4: return vMath.vec4.fromValues( Buffer[id*4], Buffer[id*4+1], Buffer[id*4+2], Buffer[id*4+3]); break;
	}
	return null;		
}
function Float32ArrayFromBuffer(itemSize, Buffer){
	var len = Buffer.length * itemSize;
	var floatArray = new Float32Array(len);
	
	for(var i = 0; i < Buffer.length; ++i){
		var vec = Buffer[i];
		for(var j = 0; j < itemSize; ++j){
			floatArray[i*itemSize+j] = vec[j];
		}
	}
	return floatArray;
}

class CTextureShaderLink
{
	constructor(textureSlotID, strUniformLocation){
		this.TextureSlotID = textureSlotID;
		this.UniformLocationStr = strUniformLocation;
	}
}

 /*
 GL_ZERO, GL_ONE, GL_SRC_COLOR, GL_ONE_MINUS_SRC_COLOR, GL_DST_COLOR, GL_ONE_MINUS_DST_COLOR,
 GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA, GL_DST_ALPHA, GL_ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR,
 GL_ONE_MINUS_CONSTANT_COLOR, GL_CONSTANT_ALPHA, and GL_ONE_MINUS_CONSTANT_ALPHA.
 
 GL_FUNC_ADD, GL_FUNC_SUBTRACT, GL_FUNC_REVERSE_SUBTRACT, GL_MIN, GL_MAX.
 */

 /*
 gl.ZERO, gl.ONE, gl.SRC_COLOR, gl.ONE_MINUS_SRC_COLOR, gl.DST_COLOR, gl.ONE_MINUS_DST_COLOR,
 gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.DST_ALPHA, gl.ONE_MINUS_DST_ALPHA. gl.CONSTANT_COLOR,
 gl.ONE_MINUS_CONSTANT_COLOR, gl.CONSTANT_ALPHA, and gl.ONE_MINUS_CONSTANT_ALPHA.
 
 gl.FUNC_ADD, gl.FUNC_SUBTRACT, gl.FUNC_REVERSE_SUBTRACT, gl.MIN, gl.MAX.
 */
 
var ActiveBlendMode = null;
export var BlendMode_AlphaBlend    = null;
export var BlendMode_Additive 	   = null;
export var BlendMode_SrcOverride   = null;
export var BlendMode_Default       = null;

export class CBlendMode{
	
	static Zero(){ 					return gl.ZERO; }
	static One(){					return gl.ONE; }
	static SrcColor(){				return gl.SRC_COLOR; }
	static OneMinusSrcColor(){		return gl.ONE_MINUS_SRC_COLOR; }
	static DstColor(){				return gl.DST_COLOR; }
	static OneMinusDstColor(){		return gl.ONE_MINUS_DST_COLOR; }
	static SrcAlpha(){				return gl.SRC_ALPHA; }
	static OneMinusSrcAlpha(){		return gl.ONE_MINUS_SRC_ALPHA; }
	static DstAlpha(){				return gl.DST_ALPHA; }
	static OneMinusDstAlpha(){		return gl.ONE_MINUS_DST_ALPHA; }
	static ConstantColor(){			return gl.CONSTANT_COLOR; }
	static OneMinusConstantColor(){ return gl.ONE_MINUS_CONSTANT_COLOR; }
	static ConstantAlpha(){			return gl.CONSTANT_ALPHA; }
	static OneMinusConstantAlpha(){ return gl.ONE_MINUS_CONSTANT_ALPHA; }
	
	static EqAdd(){				return gl.FUNC_ADD; }
	static EqSubtract(){  		return gl.FUNC_SUBTRACT; }
	static EqReverseSubtract(){	return gl.FUNC_REVERSE_SUBTRACT; }
	static EqMin(){				return gl.MIN; }
	static EqMax(){				return gl.MAX; }
	
	constructor(s,d,e)
	{
		if(s===undefined) this.src = CBlendMode.One();
		else this.src = s;
		if(d===undefined) this.dst = CBlendMode.Zero();
		else this.dst = d;
		if(e===undefined) this.eq = CBlendMode.EqAdd();
		else this.eq = e;
	}
	
	setBlendSrcDst(source, destination){
		this.src = source; this.dst = destination;
	}
	
	setBlendEquation(eq){
		this.eq = eq;
	}
	
	setBlendMode( b ){ this.setBlendSrcDst(b.getSrcBlend(), b.getDstBlend()); this.setBlendEquation( b.getEquation() ); }
	
	getSrcBlend(){ return this.src; }
	getDstBlend(){ return this.dst; }
	getEquation(){ return this.eq;  }
	
	isEqual(b){ return (this.getSrcBlend() == b.getSrcBlend() && this.getDstBlend() == b.getDstBlend() && this.getEquation() == b.getEquation()); }
	
	Bind(){
		if(ActiveBlendMode instanceof CBlendMode)
			if(this.isEqual(ActiveBlendMode) == true) return;
		gl.blendFunc(this.src, this.dst);
		gl.blendEquation(this.eq);
		ActiveBlendMode = this;
	}
	
	static getDefault(){ return BlendMode_Default; }
	static setDefault(b){ BlendMode_Default.setBlendSrcDst(b.getSrcBlend(), b.getDstBlend()); BlendMode_Default.setBlendEquation(b.getEquation()); }
	
	static Init(){
		BlendMode_AlphaBlend  = new CBlendMode( CBlendMode.SrcAlpha(), CBlendMode.OneMinusSrcAlpha(), CBlendMode.EqAdd() );
		BlendMode_Additive 	  = new CBlendMode( CBlendMode.One(), CBlendMode.One(), CBlendMode.EqAdd() );
		BlendMode_SrcOverride = new CBlendMode( CBlendMode.One(), CBlendMode.Zero(), CBlendMode.EqAdd() );
		BlendMode_Default     = new CBlendMode( CBlendMode.One(), CBlendMode.Zero(), CBlendMode.EqAdd() );
		
		CBlendMode.Enable();
		BlendMode_Default.Bind();
		ActiveBlendMode = BlendMode_Default;
	}
	
	static Enable(){
		gl.enable(gl.BLEND);
	}
	static Disable(){
		gl.disable(gl.BLEND);
	}
}

class CBlendModeColorAttachment extends CBlendMode
{
	constructor(i,s,d,e){
		super(s,d,e);
		if(i===undefined) this.id = 0;
		else this.id = i;
	}
		
	setColorAttachmentNumber(i){ this.id = i; }
	getColorAttachmentNumber(){ return this.id; }
	
	Bind(i){ if(i!==undefined) this.id = i; gl.blendFunci(this.id, this.src, this.dst); gl.blendEquationi(this.id, this.eq); ActiveBlendMode = this; }
}

export class CBlendModeColorAttachments
{
	constructor(){
		this.blendModes = [];
	}
	
	addBlendMode(slot, blendMode){
		this.blendModes[slot] = new CBlendModeColorAttachment(slot, blendMode.getSrcBlend(), blendMode.getDstBlend(), blendMode.getEquation());
	}
	clearBlendMode(slot){
		this.blendModes[slot] = null;
	}
	Bind(){
		if(ActiveBlendMode === this) return;
		
		for(var i = 0; i < this.blendModes.length; ++i)
			if(this.blendModes[i] != null) this.blendModes[i].Bind();
		ActiveBlendMode = this;
	}
}

export class CModel
{
	constructor(slotID)
	{
		this.SlotID = slotID;
		
		this.VertexBuffer = [];
		this.BinormalBuffer = [];
		this.TangentBuffer = [];
		this.NormalBuffer = [];
		this.TexCoordBuffer = [];
		this.IndexBuffer = [];
		
		this.glVertexBuffer = -1;
		this.glIndexBuffer = -1;
		this.glNormalBuffer = -1;
		this.glBinormalBuffer = -1;
		this.glTangentBuffer = -1;
		this.glTexCoordBuffer = -1;
			
		this.shaderID = -1;
		this.textures = [];
		
		this.blendMode = null;
		
		this.VertexType = "";
		
		this.Position = vMath.vec3.create();
		this.Transform = vMath.mat4.create();
		
		this.name = "";
		this.fileData = null;
	}
	
	setBlendMode(b){
		if(this.blendMode == null) this.blendMode = new CBlendMode();
		this.blendMode.setBlendMode(b);
	}
	
	setTexture(texture, uniformLocationStr){
		this.textures[this.textures.length] = new CTextureShaderLink(texture.SlotID, uniformLocationStr);
	}
	setShader(shader){
		this.shaderID = shader.SlotID;
	}
	
	BindTextureToShader(slot, textureLink, shader){
		var ULocation = shader.getPrefetchedUniformLocation(textureLink.UniformLocationStr);
		var texture = CTextureList.get(textureLink.TextureSlotID);
		texture.Bind(slot, ULocation);
	}
	BindTexturesToShader(shader){
		for(var i = 0; i < this.textures.length; ++i){
			this.BindTextureToShader(i, this.textures[i], shader);
		}
	}
	
	isTypeOf(string){ return this.VertexType == string; }
	
	setPosition(pos){
		this.Position = pos;
		vMath.mat4.setTranslation(this.Transform,this.Transform,pos);
	}
	
	CreateBuffers(){
		switch(this.VertexType){
			case "v":
				this.glVertexBuffer = gl.createBuffer();
				break;
			case "vn":
				this.glVertexBuffer = gl.createBuffer();
				this.glNormalBuffer = gl.createBuffer();
				break;
			case "vt":
				this.glVertexBuffer = gl.createBuffer();
				this.glTexCoordBuffer = gl.createBuffer();
				break;
			case "vtn":
				this.glVertexBuffer = gl.createBuffer();
				this.glNormalBuffer = gl.createBuffer();
				this.glTexCoordBuffer = gl.createBuffer();
				this.glTangentBuffer = gl.createBuffer();
				break;
		}
		this.glIndexBuffer = gl.createBuffer();
		
		if(this.glVertexBuffer != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, Float32ArrayFromBuffer(this.VertexBuffer.itemSize, this.VertexBuffer), gl.STATIC_DRAW);
			this.glVertexBuffer.itemSize = this.VertexBuffer.itemSize;
			this.glVertexBuffer.numItems = this.VertexBuffer.length;
		}
		
		if(this.glNormalBuffer != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glNormalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, Float32ArrayFromBuffer(this.NormalBuffer.itemSize, this.NormalBuffer), gl.STATIC_DRAW);
			this.glNormalBuffer.itemSize = this.NormalBuffer.itemSize;
			this.glNormalBuffer.numItems = this.NormalBuffer.length;
		}
		
		if(this.glTexCoordBuffer != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, Float32ArrayFromBuffer(this.TexCoordBuffer.itemSize, this.TexCoordBuffer), gl.STATIC_DRAW);
			this.glTexCoordBuffer.itemSize = this.TexCoordBuffer.itemSize;
			this.glTexCoordBuffer.numItems = this.TexCoordBuffer.length;
		}
		
		if(this.glTangentBuffer != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTangentBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, Float32ArrayFromBuffer(this.TangentBuffer.itemSize, this.TangentBuffer), gl.STATIC_DRAW);
			this.glTangentBuffer.itemSize = this.TangentBuffer.itemSize;
			this.glTangentBuffer.numItems = this.TangentBuffer.length;
		}
		
		if(this.glIndexBuffer != -1){
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.IndexBuffer), gl.STATIC_DRAW);
			this.glIndexBuffer.numItems = this.IndexBuffer.length;
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}
	
	DeleteBuffers(){
		if(this.glVertexBuffer != -1) gl.deleteBuffer(this.glVertexBuffer); this.glVertexBuffer = -1;
		if(this.glNormalBuffer != -1) gl.deleteBuffer(this.glNormalBuffer); this.glNormalBuffer = -1;
		if(this.glTexCoordBuffer != -1) gl.deleteBuffer(this.glTexCoordBuffer); this.glTexCoordBuffer = -1;
		if(this.glIndexBuffer != -1) gl.deleteBuffer(this.glIndexBuffer); this.glIndexBuffer = -1;
	}
	
	ImportFromObj(string){
		this.fileData = string;
		
		var ObjModelImport = new CModelImport();
		ObjModelImport.ImportOBJ(this, string);
		ObjModelImport.CalcTangents(this);
		
		this.CreateBuffers();
		// delete ObjModelImport;
	}
	
	ImportFrom(id){
		var str = getContentsFromFile(id);
		if(str == null) return false;
		
		this.name = id;
		
		this.ImportFromObj(str);
		return true;
	}
	
	RenderIndexed(shader, mode){
		
		/*
		shader.ALVertexPosition;
		shader.ALVertexNormal;
		shader.ALVertexTangent;
		shader.ALVertexBinormal;
		shader.ALVertexTexCoord;
		*/
		
		if(shader.isBinded() == false){ shader.Bind(); }
        // gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        if(shader.ULMatrixModel != -1 && shader.ULMatrixModel != null) gl.uniformMatrix4fv(shader.ULMatrixModel, false, this.Transform);
		
		if(this.glVertexBuffer != -1 && shader.ALVertexPosition != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
			gl.vertexAttribPointer(shader.ALVertexPosition, this.glVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexPosition);
		}
		
		if(this.glNormalBuffer != -1 && shader.ALVertexNormal != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glNormalBuffer);
			gl.vertexAttribPointer(shader.ALVertexNormal, this.glNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexNormal);
		}
		
		if(this.glTexCoordBuffer != -1 && shader.ALVertexTexCoord != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
			gl.vertexAttribPointer(shader.ALVertexTexCoord, this.glTexCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexTexCoord);
		}
		
		if(this.glTangentBuffer != -1 && shader.ALVertexTangent != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTangentBuffer);
			gl.vertexAttribPointer(shader.ALVertexTangent, this.glTangentBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexTangent);
		}
		
		if(this.blendMode != null)
			this.blendMode.Bind();
		
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndexBuffer);
		gl.drawElements( mode, this.glIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		
		if(this.blendMode != null)
			CBlendMode.getDefault().Bind();
	}
	
	RenderIndexedTriangles(shader){
		this.RenderIndexed(shader, gl.TRIANGLES);
	}	
	RenderIndexedTriangleStrip(shader){
		this.RenderIndexed(shader, gl.TRIANGLE_STRIP);
	}
	RenderIndexedTriangleFan(shader){
		this.RenderIndexed(shader, gl.TRIANGLE_FAN);
	}
	
	RenderIndexedLines(shader){
		this.RenderIndexed(shader, gl.LINES);
	}
	
	RenderIndexedPoints(shader){
		this.RenderIndexed(shader, gl.POINTS);
	}
}

class CModelImport
{	
	constructor(){
		this.VertexBuffer = [];
		this.VertexIndexBuffer = [];
		this.BinormalBuffer = [];
		this.BinormalIndexBuffer = [];
		this.TangentBuffer = [];
		this.TangentIndexBuffer = [];
		this.NormalBuffer = [];
		this.NormalIndexBuffer = [];
		this.TexCoordBuffer = [];
		this.TexCoordIndexBuffer = [];
		this.VertexType = "";
	}
	
	ImportOBJ(model, string){
		
		this.VertexBuffer.itemSize = 0;
		this.TexCoordBuffer.itemSize = 0;
		this.NormalBuffer.itemSize = 0;
		
		var lines = string.split("\n");
		for(var l = 0; l < lines.length; ++l){
			var line = lines[l]; line = line.trim();
			var elems = line.split(" ");
			
			var iOf = elems.indexOf("");
			while(iOf != -1){ elems.splice(iOf,1); iOf = elems.indexOf(""); }
			
			switch(elems[0]){
				case "v":{
					this.VertexBuffer[this.VertexBuffer.length] = vMath.vec3.fromValues(
						parseFloat(elems[1]),
						parseFloat(elems[2]),
						parseFloat(elems[3]));
					this.VertexBuffer.itemSize = 3;
					break;
				}
				case "vt":{
					this.TexCoordBuffer[this.TexCoordBuffer.length] = vMath.vec2.fromValues(
						parseFloat(elems[1]),
						parseFloat(elems[2]));
					this.TexCoordBuffer.itemSize = 2;
					break;
				}
				case "vn":{
					this.NormalBuffer[this.NormalBuffer.length] = vMath.vec3.fromValues(
						parseFloat(elems[1]),
						parseFloat(elems[2]),
						parseFloat(elems[3]));
					this.NormalBuffer.itemSize = 3;
					break;
				}
				case "f":{
					for(var e = 1; e <= 3; ++e){
						var subelems = elems[e].split("/");
						if(subelems.length == 1){
							this.VertexType = "v";
							this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
						}else if(subelems.length == 2){
							var texture = elems[e].indexOf("//") === -1;
							if(texture === 1){
								this.VertexType = "vt";
								this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
								this.TexCoordIndexBuffer[this.TexCoordIndexBuffer.length] = parseInt(subelems[1])-1;
							}else{
								this.VertexType = "vn";
								this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
								this.NormalIndexBuffer[this.NormalIndexBuffer.length] = parseInt(subelems[1])-1;
							}
						}else{
							this.VertexType = "vtn";
							this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
							this.TexCoordIndexBuffer[this.TexCoordIndexBuffer.length] = parseInt(subelems[1])-1;
							this.NormalIndexBuffer[this.NormalIndexBuffer.length] = parseInt(subelems[2])-1;
						}
					}					
					break;
				}
			}
		
		}
		
		if(this.VertexType != "v"){
			for(var v = 0; v < this.VertexIndexBuffer.length; ++v){
				
				model.VertexBuffer[model.VertexBuffer.length] = this.VertexBuffer[this.VertexIndexBuffer[v]];
				
				if(this.VertexType == "vn"){
					model.NormalBuffer[model.NormalBuffer.length] = this.NormalBuffer[this.NormalIndexBuffer[v]];
				}else if(this.VertexType == "vt"){
					model.TexCoordBuffer[model.TexCoordBuffer.length] = this.TexCoordBuffer[this.TexCoordIndexBuffer[v]];
				}else if(this.VertexType == "vtn"){
					model.TexCoordBuffer[model.TexCoordBuffer.length] = this.TexCoordBuffer[this.TexCoordIndexBuffer[v]];
					model.NormalBuffer[model.NormalBuffer.length] = this.NormalBuffer[this.NormalIndexBuffer[v]];
				}
				
				model.IndexBuffer[model.IndexBuffer.length] = v;
			}
		}
		else{
			for(var f = 0; f < this.VertexIndexBuffer.length; ++f){
				model.IndexBuffer[model.IndexBuffer.length] = this.VertexIndexBuffer[f];
			}
			for(var v = 0; v < this.VertexBuffer.length; ++v){
				model.VertexBuffer[model.VertexBuffer.length] = this.VertexBuffer[v];
			}
		}
		
		model.VertexBuffer.itemSize = this.VertexBuffer.itemSize;
		model.NormalBuffer.itemSize = this.NormalBuffer.itemSize;
		model.TexCoordBuffer.itemSize = this.TexCoordBuffer.itemSize;
		
		model.VertexType = this.VertexType;	
		
	};
	
	//uzeto sa http://www.terathon.com/code/tangent.html
	CalcTangents(model){
		
		if(model.IndexBuffer.length <= 0) return false;
		if(model.TexCoordBuffer.length <= 0) return false;
		if(model.NormalBuffer.length <= 0) return false;
		
		var vertexCount = model.VertexBuffer.length;
		var faceCount = model.IndexBuffer.length;
		
		var tan1 = [];
		var tan2 = [];
		
		for(var i = 0; i < vertexCount; ++i){
			model.TangentBuffer[i] = vMath.vec3.create();
			tan1[i] = vMath.vec3.create();
			tan2[i] = vMath.vec3.create();
		}
		
		for(var f = 0; f < faceCount; f+=3){
			
			var ID0 = model.IndexBuffer[f+0];
			var ID1 = model.IndexBuffer[f+1];
			var ID2 = model.IndexBuffer[f+2];
			
			var v0 = model.VertexBuffer[ID0];
			var v1 = model.VertexBuffer[ID1];
			var v2 = model.VertexBuffer[ID2];
			var tx0 = model.TexCoordBuffer[ID0];
			var tx1 = model.TexCoordBuffer[ID1];
			var tx2 = model.TexCoordBuffer[ID2];
			
			var x1 = vMath.vec3.X(v1) - vMath.vec3.X(v0);
			var x2 = vMath.vec3.X(v2) - vMath.vec3.X(v0);
			var y1 = vMath.vec3.Y(v1) - vMath.vec3.Y(v0);
			var y2 = vMath.vec3.Y(v2) - vMath.vec3.Y(v0);
			var z1 = vMath.vec3.Z(v1) - vMath.vec3.Z(v0);
			var z2 = vMath.vec3.Z(v2) - vMath.vec3.Z(v0);
			
			var s1 = vMath.vec2.X(tx1) - vMath.vec2.X(tx0);
			var s2 = vMath.vec2.X(tx2) - vMath.vec2.X(tx0);
			var t1 = vMath.vec2.Y(tx1) - vMath.vec2.Y(tx0);
			var t2 = vMath.vec2.Y(tx2) - vMath.vec2.Y(tx0);
			
			var div = s1 * t2 - s2 * t1;
			if(Math.abs(div) <= 0.000001) div = (div < 0.0)? -0.000001 : 0.000001;
			
			var r = 1.0 / div;
			var sdir = vMath.vec3.fromValues((t2 * x1 - t1 * x2) * r, (t2 * y1 - t1 * y2) * r, (t2 * z1 - t1 * z2) * r);
			var tdir = vMath.vec3.fromValues((s1 * x2 - s2 * x1) * r, (s1 * y2 - s2 * y1) * r, (s1 * z2 - s2 * z1) * r);
			
			vMath.vec3.add(tan1[ID0], tan1[ID0], sdir);
			vMath.vec3.add(tan1[ID1], tan1[ID1], sdir);
			vMath.vec3.add(tan1[ID2], tan1[ID2], sdir);
			
			vMath.vec3.add(tan2[ID0], tan2[ID0], tdir);
			vMath.vec3.add(tan2[ID1], tan2[ID1], tdir);
			vMath.vec3.add(tan2[ID2], tan2[ID2], tdir);
			
		}
		
		for(var i = 0; i < vertexCount; ++i){
			
			var n = model.NormalBuffer[i];
			var t = tan1[i];
			
			var dNT = vMath.vec3.dot(n, t);
			var a = vMath.vec3.fromValues( vMath.vec3.X(t) - dNT*vMath.vec3.X(n),
									 vMath.vec3.Y(t) - dNT*vMath.vec3.Y(n),
									 vMath.vec3.Z(t) - dNT*vMath.vec3.Z(n) );
			
			var tangent = model.TangentBuffer[i];
			vMath.vec3.normalize(tangent, a);
			model.TangentBuffer[i] = tangent;			
		}
		
		model.TangentBuffer.itemSize = 3;
		
		// delete tan1; delete tan2;
		return true;
	}
}


export function GenCubeModel(model, min, max)
{
	if(min === undefined) min = -1.0;
	if(max === undefined) max =  1.0;
	
	model.VertexBuffer = [
				// Front face
				[min, min, max],
				[max, min, max],
				[max, max, max],
				[min, max, max],

				// Back face
				[min, min, min],
				[min, max, min],
				[max, max, min],
				[max, min, min],

				// Top face
				[min, max, min],
				[min, max, max],
				[max, max, max],
				[max, max, min],

				// Bottom face
				[min, min, min],
				[max, min, min],
				[max, min, max],
				[min, min, max],

				// Right face
				[max, min, min],
				[max, max, min],
				[max, max, max],
				[max, min, max],

				// Left face
				[min, min, min],
				[min, min, max],
				[min, max, max],
				[min, max, min],
			  ];
	model.VertexBuffer.itemSize = 3;
	
	model.NormalBuffer = [
				// Front face
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],

				// Back face
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],

				// Top face
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],

				// Bottom face
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],

				// Right face
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],

				// Left face
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
			  ];
	model.NormalBuffer.itemSize = 3;
	
	model.IndexBuffer = [
			0,  1,  2,      0,  2,  3,    // front
			4,  5,  6,      4,  6,  7,    // back
			8,  9,  10,     8,  10, 11,   // top
			12, 13, 14,     12, 14, 15,   // bottom
			16, 17, 18,     16, 18, 19,   // right
			20, 21, 22,     20, 22, 23,   // left
		  ];

	model.VertexType = "vn";
	model.CreateBuffers();
}

export function GenQuadModel(model, min, max)
{
	if(min === undefined) min = -1.0;
	if(max === undefined) max =  1.0;
	
	model.VertexBuffer = [
				// Front face
				[min, min, 0.0],
				[max, min, 0.0],
				[max, max, 0.0],
				[min, max, 0.0],
				
			];
	model.VertexBuffer.itemSize = 3;
	
	model.TexCoordBuffer = [
				// Front face
				[ 0.0,  0.0],
				[ 1.0,  0.0],
				[ 1.0,  1.0],
				[ 0.0,  1.0],
			];
	model.TexCoordBuffer.itemSize = 2;
	
	model.IndexBuffer = [
			0,  1,  2,      0,  2,  3,    // front
		  ];

	model.VertexType = "vt";
	model.CreateBuffers();
}

var NDCQuadModel = null;
export function InitNDCQuadModel(){
	if(NDCQuadModel != null) return;
	
	NDCQuadModel = new CModel(-1);
	GenQuadModel(NDCQuadModel, -1, 1);
}

export { NDCQuadModel };