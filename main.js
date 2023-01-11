import * as glext from "./WebGL/GLExt/GLExt.js"
import * as sys from "./WebGL/System/sys.js"
import * as vMath from "./WebGL/glMatrix/gl-matrix.js"

var gl = null;

var models = [];
var activeModel = null;
var shaders = [];
var activeShader = null;
export function LoadModel(modelId){

	for(var i = 0; i < models.length; i++){
		if(models[i].name == modelId){
			activeModel = models[i];
			return;
		}
	}
	
	
	var new_model = new glext.CModel(models.length);
	new_model.ImportFrom(modelId);
	
	models[models.length] = new_model;
	activeModel = new_model;
}

export function LoadShader(shdId){
	
	for(var i = 0; i < shaders.length; i++){
		if(shaders[i].FragmentShaderName == shdId){
			activeShader = shaders[i];
			return;
		}
	}
	
	var newShader = new glext.CShader(0);
	if(newShader.CompileFromFile("simpleVS", shdId) == false) alert("Shader not compiled!");
	newShader.InitDefaultAttribLocations();
	newShader.InitDefaultUniformLocations();
	newShader.ULTextureAmb = newShader.getUniformLocation("txAmbient");
	newShader.setFlagsUniform(1);
	
	glext.CShaderList.addShader(newShader);	
	
	shaders[shaders.length] = newShader;
	activeShader = newShader;
}

export function main(){
	
	var gs = sys.storage.CGlobalStorage.getSingleton();
	sys.mouse.InitMouse(document);
	sys.keyboard.InitKeyboard(document);
	sys.CheckWhatBrowser();
	
	gl = glext.glInit("glcanvas");
	if(gl == null) return;
	
	glext.InitDebugTextDOM("debug_text");
	
	gl.blendColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	
	gl.disable(gl.BLEND);
	gl.depthFunc(gl.LESS);
	
	glext.CShaderDefines.addGlobalDefine("MAX_LIGHTS", " "+glext.MAX_LIGHTS);
	
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);		
	
	gl.clearColor(0.5, 0.5, 0.5, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);	
	
	LoadShader("simpleReflectionFS");
	LoadModel("BunnyModel");	
	
	var startViewDir = [1.6,0.0,0.0];
	vMath.vec3.normalize(startViewDir, startViewDir);
	vMath.vec3.scale(startViewDir, startViewDir, 2);
	
	var txArray = document.getElementById("txReflLivada").childNodes;
	var txReflLivada = new glext.CTextureCube(0); txReflLivada.CreateWithDefaultParams(txArray);
	glext.CTextureList.addTexture(txReflLivada);
	
	activeModel.setTexture(txReflLivada,"txAmbient");
	
	vMath.mat4.identity(activeModel.Transform);
	vMath.mat4.rotate(activeModel.Transform, activeModel.Transform, vMath.deg2rad(-90.0), [1,0,0]);
	
	var time = 0.0;
	sys.time.init();
	
	var oldframe_time = -1.0;
	var avg_frame_time = 1.0/60.0;
	
	var eyePt = vMath.vec3.fromValues(startViewDir[0],startViewDir[1],startViewDir[2]);
	var centerPt = vMath.vec3.fromValues(0.0,0.0,0.0);
	var upDir = vMath.vec3.fromValues(0.0,1.0,0.0);
	
	var FOV = 65.0;
	var Camera = new glext.CCamera(0, gl.viewportWidth, gl.viewportHeight);
	
	Camera.setPositionAndLookPt(eyePt, [0.0,0.0,0.0], upDir);
	Camera.setFOV(FOV);
	
	Camera.UpdateProjectionMatrix();
	Camera.UpdateViewMatrix();
	
	var sliderRed = document.getElementById("sliderRed");
	var sliderGreen = document.getElementById("sliderGreen");
	var sliderBlue = document.getElementById("sliderBlue");
	
	var delay_ms = 17;
	
	function renderFrame()
	{
		time = sys.time.getSecondsSinceStart();
		var frame_time = time - oldframe_time;
		
		let modelColor = [sliderRed.value/100.0, sliderGreen.value/100.0, sliderBlue.value/100.0];
		
		var avg_FPS = 1.0 / avg_frame_time;
		
		vMath.mat4.identity(activeModel.Transform);
		vMath.mat4.rotate(activeModel.Transform, activeModel.Transform, vMath.deg2rad(time*10), [0,1,0]);/*  */
			
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			activeShader.Bind();
				activeModel.BindTexturesToShader(activeShader);
				
				activeShader.setViewMatrixUniform( Camera.ViewMatrix );
				activeShader.setProjectionMatrixUniform( Camera.ProjectionMatrix );
				
				let modelColorUL = activeShader.getUniformLocation("modelColor");
				activeShader.setFloat3Uniform(modelColorUL, modelColor);
				
				activeShader.setTimeUniform(time);
				
				activeShader.setCameraPositionUniform(eyePt);
				
				activeModel.RenderIndexedTriangles(activeShader);
			
		sys.mouse.Update();
		sys.keyboard.Update();
		gl.flush();
		gs.Update();
		
		oldframe_time = time;
	}
	
	avg_frame_time = 1.0/60.0;
	oldframe_time = sys.time.getSecondsSinceStart();
	
	if(sys.browser.isChrome == true)
	{
		renderFrame();
		avg_frame_time = 1.0/60.0;
		
		setTimeout(function(){
			oldframe_time = sys.time.getSecondsSinceStart();
			setInterval( function(){ window.requestAnimationFrame(renderFrame); }, delay_ms);
		}, 1000.0);
	}
	else
		setInterval( function(){ window.requestAnimationFrame(renderFrame); }, delay_ms);
	
	return;
}

export function RecompileShader(fragment_name){
	if(gl == null) return;
	
	for(var i = 0; i < glext.CShaderList.count(); ++i)
	{
		var shader = glext.CShaderList.get(i);
		if(shader.FragmentShaderName == fragment_name)
		{
			var bResetDefines = true;
			
			shader.Recompile(bResetDefines);
			shader.InitDefaultAttribLocations();
			shader.InitDefaultUniformLocations();
			shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
			
			break;
		}
	}	
}






