"""Render the grove's articulated 3D characters into mobile-friendly WebP sheets.
Run from the checkout root: python tools/render-grove-creatures.py
Requires NumPy and Pillow. Axes are right, up, and forward; feet share y=0.
"""
import math
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path('assets/grove-creatures-v1')
W, H, SS = 168, 188, 1.5
S = int(W * SS), int(H * SS)
SCALE = 75 * SS
GROUND = H * SS - 13 * SS
ANGLES = (30, -30, 139, -139)
LIGHT = np.array([-.49, .74, .46])
LIGHT /= np.linalg.norm(LIGHT)
def unit(a):
    return a / np.linalg.norm(a)
def rgb(h):
    return np.array(list(bytes.fromhex(h)), dtype=float)
def rotate(axis, angle):
    c,s=math.cos(angle),math.sin(angle)
    return {'x':np.array([[1,0,0],[0,c,-s],[0,s,c]]),
            'y':np.array([[c,0,s],[0,1,0],[-s,0,c]]),
            'z':np.array([[c,-s,0],[s,c,0],[0,0,1]])}[axis]
def model(kind, chief, phase, idle):
    objects=[]
    stride=math.sin(phase)
    # Grounded half of each stride sweeps back while the raised shoe returns.
    def leg(side):
        if idle:
            return 0, 0
        a=phase+(math.pi if side<0 else 0)
        return .33*math.sin(a), .21*max(0,math.cos(a))**1.5
    bob=.036*(1-math.cos(phase*2))-.024
    def ball(pos,rad,color,material='matte',axis='z',angle=0):
        objects.append((np.array(pos,float),np.array(rad,float),rotate(axis,angle),rgb(color),material))
    def body(x,y,z,rx,ry,rz,color,material='matte',tilt=0):
        ball((x,y+bob,z),(rx,ry,rz),color,material,angle=tilt)
    def face(y,z,spread,scale=1):
        for side in (-1,1):
            x=side*spread
            body(x,y,z,.085*scale,.11*scale,.047,'48333A','eye')
            body(x-.015*scale,y+.031*scale,z+.043,.023*scale,.026*scale,.010,'FFF2D7')
            body(x+.020*scale,y-.041*scale,z+.039,.012,.010,.009,'F7C383')
            body(x*1.39,y-.087*scale,z-.043,.085*scale,.039*scale,.029,'EEA698')
        for k in range(9):
            t=(k-4)/4
            body(.081*t,y-.127+.033*t*t,z+.065,.019,.014,.016,'70453A')
    def star(x,y,z,r):
        body(x,y,z,r*.64,r*.61,.046,'FFC25A')
        for k in range(5):
            a=k*2*math.pi/5
            body(x+.52*r*math.sin(a),y+.52*r*math.cos(a),z,r*.26,r*.57,.047,'FFD36B',tilt=-a)
    if kind=='mushroom':
        for s in (-1,1):
            dz,lift=leg(s)
            ball((s*.245,.145+lift,.055+dz),(.18,.146,.226),'DCC29E')
            body(s*.48,.65,-s*stride*.16,.13,.23,.125,'EBD6B4',tilt=s*.35)
        body(0,.72,0,.54,.63,.45,'F3DFC0','felt')
        face(.91,.392,.19)
        body(0,1.299,0,.846,.139,.695,'E8CDA6','gills')
        body(0,1.34,0,.85,.58,.70,'A94735' if chief else 'D96343','cap')
        if chief:
            body(0,.585,0,.54,.112,.462,'456E68')
            body(-.34,.50,.31,.11,.19,.051,'608783',tilt=-.38)
            star(.15,.60,.442,.098)
    elif kind=='acorn':
        for s in (-1,1):
            dz,lift=leg(s)
            ball((s*.242,.214+lift/2,dz*.66),(.086,.16,.09),'794827')
            ball((s*.242,.108+lift,.061+dz),(.164,.112,.211),'945530')
            body(s*.56,.71,-s*stride*.19,.10,.195,.11,'995831',tilt=s*.56)
        body(0,.89,0,.56,.72,.49,'CC8A47','wood')
        face(.90,.440,.217,1.08)
        body(0,1.411,0,.633,.325,.56,'8D542E','nutcap')
        # Overlapping rounded bracts follow the actual circumference of the cup.
        for row,(y,rx,rz,count) in enumerate(((1.38,.56,.50,12),(1.52,.46,.405,10),(1.61,.30,.25,8))):
            for k in range(count):
                a=2*math.pi*(k+row*.46)/count
                ball((rx*math.sin(a),y+bob,rz*math.cos(a)),(.158,.12,.077),
                     ('AA733D','AF793F','9C6736')[(k+row)%3],'wood','y',a)
        body(.045,1.765,0,.072,.175,.069,'705437',tilt=-.31)
        body(-.081,1.845,0,.201,.074,.083,'91AC5A','leaf',tilt=-.54)
        if chief:
            body(.225,1.82,-.018,.183,.066,.067,'D5AB50','leaf',tilt=.55)
            body(0,.493,0,.51,.087,.431,'416B60')
            body(-.39,.502,.294,.145,.177,.052,'BCA065',tilt=-.23)
    else:
        # The cloud's underside is one continuous bank. The scene supplies its lift.
        bob=0
        billow=0 if idle else math.sin(phase)
        body(0,.66,0,.47,.26,.37,'C6B6E8','felt')
        body(0,1.03,0,.633,.614,.491,'CFBDEB','felt')
        for x,y,z,rx,ry,rz in [
            (-.48,.84,.04,.295,.31,.285),(.49,.91,.02,.30,.35,.30),
            (-.43,1.26,.01,.32,.32,.31),(.35,1.36,-.02,.32,.30,.33),
            (-.08,1.49,-.04,.37,.34,.32),(-.32,.63,.06,.29,.22,.26),(.25,.61,.06,.30,.23,.26),
            (0,1.13,-.35,.43,.45,.28),(-.28,1.37,.19,.23,.20,.21)]:
            body(x,y,z,rx,ry,rz,'C6B6E8','felt')
        for s in (-1,1):
            body(s*(.56+.018*billow),.80+s*.023*billow,.22,.19,.16,.18,'DDCCF4')
        face(1.04,.45,.214,1.12)
        star(.15,1.58,.207,.177)
        if chief:
            star(-.27,1.49,.33,.111)
            body(.46,1.28,.25,.20,.085,.083,'537BA4',tilt=-.63)
            star(.55,1.23,.30,.08)
    return objects

def view(direction):
    right=unit(np.cross([0,1,0],direction))
    return np.stack((right,unit(np.cross(direction,right)),direction))

def render_pass(objects, basis, need_color, width, height, scale, ground, shadow=None):
    # Orthographic ray intersections give exact depth, normals and self-occlusion.
    depth=np.full((height,width),-100.,np.float32)
    color=np.zeros((height,width,4),np.uint8) if need_color else None
    for center,radii,rot,base,material in objects:
        center_v=basis@center
        mat=basis@rot@np.diag(radii)
        inverse=np.linalg.inv(mat)
        ext=np.linalg.norm(mat,axis=1)
        x0=max(0,int((center_v[0]-ext[0])*scale+width/2)-1)
        x1=min(width,math.ceil((center_v[0]+ext[0])*scale+width/2)+1)
        y0=max(0,int(ground-(center_v[1]+ext[1])*scale)-1)
        y1=min(height,math.ceil(ground-(center_v[1]-ext[1])*scale)+1)
        if x0>=x1 or y0>=y1:continue
        yy,xx=np.mgrid[y0:y1,x0:x1]
        dx=(xx+.5-width/2)/scale-center_v[0]
        dy=(ground-yy-.5)/scale-center_v[1]
        local=dx[...,None]*inverse[:,0]+dy[...,None]*inverse[:,1]
        ray=inverse[:,2]
        b=local@ray
        aa=ray@ray
        disc=b*b-aa*((local*local).sum(axis=2)-1)
        z=(-b+np.sqrt(np.maximum(0,disc)))/aa
        zv=z+center_v[2]
        patch=depth[y0:y1,x0:x1]
        mask=(disc>=0)&(zv>patch)
        if material=='cap':
            mask &= local[:,:,1]+z*ray[1]>=-.085
        if not mask.any():continue
        patch[mask]=zv[mask]
        if not need_color:continue
        surf=local[mask]+z[mask,None]*ray
        normal=(surf/radii)@rot.T
        normal/=np.linalg.norm(normal,axis=1)[:,None]
        coords=np.column_stack((dx[mask]+center_v[0],dy[mask]+center_v[1],zv[mask]))@basis
        albedo=np.broadcast_to(base,(len(surf),3)).copy()
        x,y,w=surf.T
        if material=='cap':
            dots=np.zeros(len(y),dtype=bool)
            for level,count,radius in ((.39,9,.106),(.72,7,.105),(.94,4,.074)):
                for k in range(count):
                    a=2*math.pi*(k+level*2.3)/count
                    rr=math.sqrt(1-level**2)
                    dots|=(x-rr*math.sin(a))**2+(y-level)**2+(w-rr*math.cos(a))**2<radius**2*(1+.40*(k%3))
            albedo[dots]=[255,221,163]
            albedo[y<-.13]=[231,199,154]
            under=y<-.13
            albedo[under]*=(.92+.08*np.cos(44*np.arctan2(w[under],x[under])))[:,None]
        if material=='gills':
            albedo*=(.93+.07*np.cos(48*np.arctan2(w,x)))[:,None]
        if material=='wood':
            albedo*=(.95+.047*np.sin(24*np.arctan2(w,x)+1.5*y+np.sin(7*y)))[:,None]
        nlight=np.maximum(0,normal@LIGHT)
        soft=np.ones(len(y))
        if shadow:
            light_basis,sd,ss,sg=shadow
            lp=coords@light_basis.T
            sx=np.rint(lp[:,0]*ss+sd.shape[1]/2-.5).astype(int)
            sy=np.rint(sg-lp[:,1]*ss-.5).astype(int)
            blocked=0
            for ox,oy in ((0,0),(-2,0),(2,0),(0,-2),(0,2)):
                dz=sd[np.clip(sy+oy,0,sd.shape[0]-1),np.clip(sx+ox,0,sd.shape[1]-1)]-lp[:,2]
                blocked+=np.clip((dz-.040)*14,0,1)
            soft=1-.62*blocked/5
        sky=(normal[:,1]+1)/2
        direct=(.57+.14*sky+.39*nlight*soft)
        lit=albedo*direct[:,None]
        highlight=np.maximum(0,normal@unit(LIGHT+basis[2]))**(28 if material=='eye' else 17)
        lit+=highlight[:,None]*([46,40,32] if material=='eye' else [11,9,7])
        lit+=np.maximum(0,-normal[:,1,None])*np.array([4,3,1])
        rgba=color[y0:y1,x0:x1]
        rgba[mask,:3]=np.uint8(np.clip(lit,0,255))
        rgba[mask,3]=255
    return color if need_color else depth

def make_frame(kind,chief,yaw,step):
    angle=math.radians(yaw)
    turn=rotate('y',angle)
    objects=[(turn@c,r,turn@rot,col,m) for c,r,rot,col,m in model(kind,chief,step*math.pi/4,step==8)]
    sun=view(LIGHT)
    sd=render_pass(objects,sun,False,190,230,70,179)
    camera=view(unit(np.array([0,.20,1.])))
    pixels=render_pass(objects,camera,True,*S,SCALE,GROUND,(sun,sd,70,179))
    return Image.fromarray(pixels).resize((W,H),Image.Resampling.LANCZOS)

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    for species in ('mushroom','acorn','cloud'):
        for chief in (False,True):
            sheet=Image.new('RGBA',(W*9,H*4))
            for row,yaw in enumerate(ANGLES):
                for frame in range(9):
                    sheet.paste(make_frame(species,chief,yaw,frame),(frame*W,row*H))
            name=species+('-chief' if chief else '')
            sheet.save(OUT/(name+'.webp'),quality=92,method=5)
            print(name,flush=True)
