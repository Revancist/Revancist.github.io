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
	vec3 lightPos = 10.0 * vec3(sin(Time), 2.0 ,cos(Time));
	vec3 toLight = lightPos - Position;
	toLight = normalize(toLight);
	
	float shading = 0.5 + 0.5 * dot(toLight, Normal);
	
	gl_FragColor.xyz = shading * modelColor;
	gl_FragColor.a = 1.0;
}
