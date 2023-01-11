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
	vec3 fogColor = vec3(0.5,0.5,0.5);
	vec3 lightPos = 10.0 * vec3(sin(Time), 2.0 ,cos(Time));
	vec3 toLight = lightPos - Position;
	toLight = normalize(toLight);
	
	float shading = 0.5 + 0.5 * dot(toLight, Normal);
	float fog = pow(clamp( 2.0*PixelPosition.z-0.9, 0.0, 1.0), 8.0);
	
	gl_FragColor.xyz = lerp(shading * modelColor, fogColor, fog );
	gl_FragColor.a = 1.0;
}
