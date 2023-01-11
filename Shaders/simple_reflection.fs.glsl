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
	
	gl_FragColor.xyz = reflection * modelColor;
	gl_FragColor.a = 1.0;
}
