#version 300 es
precision highp float;

#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#define gl_FragColor glFragColor
out vec4 glFragColor;

uniform samplerCube txAmbient;

uniform float Time;
uniform vec3 modelColor;
//------------------------------------------------------------------------------

in vec3 Normal;
in vec3 Tangent;
in vec3 Bitangent;
in vec3 PixelPosition;
in vec2 TexCoords;
in vec3 Position;
in vec3 ViewVector;

//------------------------------------------------------------------------------

void main(void)
{
	vec3 view = normalize(ViewVector);
	vec3 reflectVector = reflect(view,Normal);
	vec3 reflection = texture(txAmbient, reflectVector).rgb;
	
	vec3 lightPos = 10.0 * vec3(sin(Time), 2.0 ,cos(Time));
	vec3 toLight = lightPos - Position;
	toLight = normalize(toLight);
	
	float shading = 0.5+0.5*dot(toLight, Normal);
	
	float phongSpecShading = dot(toLight, reflectVector);
	float phongSpecular = pow(1.2 * clamp(phongSpecShading-0.125, 0.0, 1.0), 64.0);
	
	gl_FragColor.xyz = lerp(modelColor * shading, phongSpecular + reflection, 0.10);
	gl_FragColor.a = 1.0;
}
