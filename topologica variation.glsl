/*--------------------------------------------------------------------------------------
License CC0 - http://creativecommons.org/publicdomain/zero/1.0/
To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.
----------------------------------------------------------------------------------------
-A variation of Otavio Good's Topologica https://www.shadertoy.com/view/4djXzz
*/

const float line_strength = .005;

//#define PROCEDURAL

#ifdef PROCEDURAL

// various noise functions
float Hash3d(vec3 uv)
{
    float f = uv.x + uv.y * 37.0 + uv.z * 521.0;
    return fract(cos(f*3.333)*100003.9);
}
float mixP(float f0, float f1, float a)
{
    return mix(f0, f1, a*a*(3.0-2.0*a));
}

const vec2 zeroOne = vec2(0.0, 1.0);

float noise(vec3 uv)
{
    vec3 fr = fract(uv.xyz);
    vec3 fl = floor(uv.xyz);
    float h000 = Hash3d(fl);
    float h100 = Hash3d(fl + zeroOne.yxx);
    float h010 = Hash3d(fl + zeroOne.xyx);
    float h110 = Hash3d(fl + zeroOne.yyx);
    float h001 = Hash3d(fl + zeroOne.xxy);
    float h101 = Hash3d(fl + zeroOne.yxy);
    float h011 = Hash3d(fl + zeroOne.xyy);
    float h111 = Hash3d(fl + zeroOne.yyy);
    return mixP(
        mixP(mixP(h000, h100, fr.x), mixP(h010, h110, fr.x), fr.y),
        mixP(mixP(h001, h101, fr.x), mixP(h011, h111, fr.x), fr.y)
        , fr.z);
}

#else

// texture noise
float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);

	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z);
	vec2 rg1 = texture( iChannel0, (uv+ vec2(0.5,0.5))/256.0, -100.0 ).yx;
	vec2 rg2 = texture( iChannel0, (uv+ vec2(1.5,0.5))/256.0, -100.0 ).yx;
	vec2 rg3 = texture( iChannel0, (uv+ vec2(0.5,1.5))/256.0, -100.0 ).yx;
	vec2 rg4 = texture( iChannel0, (uv+ vec2(1.5,1.5))/256.0, -100.0 ).yx;
	vec2 rg = mix( mix(rg1,rg2,f.x), mix(rg3,rg4,f.x), f.y );
	
	return mix( rg.x, rg.y, f.z );
}

#endif

float Density(vec3 p)
{
    float final = noise(p*0.57115);
    float other = noise(p*2.07137);	
    final -= 0.5;
    final = 0.1/(abs(final*other*other));
    return final*line_strength;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	// ---------------- First, set up the camera rays for ray marching ----------------
	vec2 uv = fragCoord.xy/iResolution.xy * 2.0 - 1.0;// - 0.5;

	// Camera up vector.
	vec3 camUp=vec3(0,1,0); // vuv

	// Camera lookat.
	vec3 camLookat=vec3(0,0.0,0);	// vrp

	float mx= iTime * 0.002;
	float my=sin(iTime * 0.006)*0.2+0.2;//*PI/2.01;
	vec3 camPos=vec3(cos(my)*cos(mx),sin(my),cos(my)*sin(mx))*(200.2); 	// prp

	// Camera setup.
	vec3 camVec=normalize(camLookat - camPos);//vpn
	vec3 sideNorm=normalize(cross(camUp, camVec));	// u
	vec3 upNorm=cross(camVec, sideNorm);//v
	vec3 worldFacing=(camPos + camVec);//vcv
	vec3 worldPix = worldFacing + uv.x * sideNorm * (iResolution.x/iResolution.y) + uv.y * upNorm;//scrCoord
	vec3 relVec = normalize(worldPix - camPos);//scp

	// --------------------------------------------------------------------------------
	float t = -5.0;
	float inc;
	float maxDepth = 70.0;
 	float density = 0.;
    
    float temp;
    
	// ray marching time
    for (int i = 0; i < 15; i++)	// This is the count of how many times the ray actually marches.
    {
        if ((t > maxDepth)) break;
    
        temp = Density(camPos + relVec * t);
        inc = 1.9 + temp*.05;	
        density += temp * inc;
 
        t += inc;
    }

	// --------------------------------------------------------------------------------
	// Now that we have done our ray marching, let's put some color on this.
	vec3 finalColor = vec3(0.6,0.09,0.01)* density * .075;
     
  	fragColor = vec4(pow(finalColor,vec3(.5)), 1.);
    
}
