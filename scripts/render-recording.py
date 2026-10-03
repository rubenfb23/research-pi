"""Optional Pillow renderer for an actual recorded CLI study, without provider calls."""
import json
from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent.parent
items=[json.loads(line) for line in (root/'assets/study.cast').read_text().splitlines()]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',16)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
frames=[];durations=[];output='';last=0
for elapsed,kind,text in items[1:]:
 if kind!='o':continue
 output+=re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]','',text).replace('\r','')
 image=Image.new('RGB',(1280,760),'#102338');draw=ImageDraw.Draw(image)
 for x,color in [(32,'#ff9e9e'),(53,'#f0cf81'),(74,'#9bedd8')]:draw.ellipse((x-6,24,x+6,36),fill=color)
 draw.text((105,21),'ResearchPi · recorded study · actual CPU measurements',fill='#a0b7cc',font=small)
 for i,line in enumerate(output.splitlines()[-27:]):
  color='#9bedd8' if ('Audit:' in line or 'accuracy ' in line) else '#edf4fa'
  draw.text((28,65+i*23),line,fill=color,font=font)
 draw.text((28,728),'Two configurations × ten seeds. Playback pacing adjusted; measured durations remain in receipts.',fill='#a0b7cc',font=small)
 frames.append(image);durations.append(max(400,min(1500,int((elapsed-last)*1000))));last=elapsed
assert 'Audit: complete' in output and len(frames)>20
# Extend only the final readable frame, preserving original recorded measurements.
durations[-1]=6000
frames[0].save(root/'assets/study.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True)
print('Rendered',len(frames),'recorded frames; playback duration',sum(durations)/1000,'seconds.')
