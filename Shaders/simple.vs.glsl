#version 300 es

in vec4 aVertexPosition;
in vec3 aVertexNormal;
in vec3 aVertexTangent;
in vec2 aTexCoords;

uniform mat4 ModelMatrix;
uniform mat4 ViewMatrix;
uniform mat4 ProjectionMatrix;

uniform vec3 CameraPosition;

out vec3 Normal;
out vec3 Tangent;
out vec3 Bitangent;
out vec3 PixelPosition;
out vec2 TexCoords;
out vec3 Position;
out vec3 ViewVector;

void main(void)
{
	vec4 wPosition = ModelMatrix * aVertexPosition;
	gl_Position = ProjectionMatrix * (ViewMatrix * wPosition);
	PixelPosition = gl_Position.xyz / gl_Position.w;
	PixelPosition = PixelPosition*0.5f + 0.5f;
	Position = wPosition.xyz;
	
	ViewVector = wPosition.xyz - CameraPosition;
	
	Normal = normalize(ModelMatrix * vec4(aVertexNormal,0.0)).xyz;
	Tangent = normalize(ModelMatrix * vec4(aVertexTangent,0.0)).xyz;
	Bitangent = normalize(cross(Tangent, Normal));
	
	TexCoords = vec2(aTexCoords.x, 1.0-aTexCoords.y);
}
