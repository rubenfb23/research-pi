import os,pty,subprocess,fcntl,termios,struct,select,tempfile,time,re,json,shutil,sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent;project=Path(tempfile.mkdtemp(prefix='repi-native-probe-')); master,slave=pty.openpty();fcntl.ioctl(slave,termios.TIOCSWINSZ,struct.pack('HHHH',30,110,0,0))
env=dict(os.environ,TERM='xterm-256color',PI_OFFLINE='1',RESEARCH_PI_DATA_DIR=str(project/'data'));env.pop('NO_COLOR',None)
other=project/'other-project';other.mkdir();subprocess.run([sys.argv[1],str(root/'dist/cli.js'),'--project',str(other),'chats','new','Other project study'],cwd=root,env=env,capture_output=True,check=True)
p=subprocess.Popen([sys.argv[1],str(root/'dist/cli.js'),'--project',str(project),'--offline'],cwd=root,env=env,stdin=slave,stdout=slave,stderr=slave);os.close(slave);buffer=''
def wait(text,start=0):
 global buffer
 end=time.monotonic()+18
 while time.monotonic()<end:
  if text in re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]','',buffer[start:]):return
  if select.select([master],[],[],.1)[0]:
   try:buffer+=os.read(master,65536).decode(errors='replace')
   except OSError:break
 raise AssertionError('Missing '+text+'\n'+buffer[-5000:])
def send(text):os.write(master,text.encode())
try:
 wait('ResearchPi v');time.sleep(.3);send('hello\r');wait('SDK session, scientific resource');time.sleep(.2);send('/name First study\r');wait('First study');time.sleep(.2);send('/new\r');time.sleep(1);start=len(buffer);send('Second study question\r');wait('SDK session, scientific resource',start);time.sleep(.2);send('/chats First study\r');wait('Open a conversation');time.sleep(.2);send('\r');time.sleep(1);start=len(buffer);send('/chats Other project study\r');wait('Open a conversation',start);time.sleep(.2);send('\r');time.sleep(1);start=len(buffer);send('[tool:project_status]\r');wait('SDK session, scientific resource',start);time.sleep(.2);send('/exit\r');assert p.wait(timeout=10)==0
 deadline=time.monotonic()+1
 while time.monotonic()<deadline and select.select([master],[],[],.1)[0]:
  try:buffer+=os.read(master,65536).decode(errors='replace')
  except OSError:break
 assert 'repi --session' in buffer,buffer[-2000:]
 files=list((project/'data/pi/conversations').glob('*.jsonl'));assert len(files)==3,files
 pointer=json.loads((project/'.research-pi/session-pointer.json').read_text());contents=Path(pointer['path']).read_text();assert 'First study' in contents and 'Second study question' not in contents
 other_pointer=json.loads((other/'.research-pi/session-pointer.json').read_text());other_contents=Path(other_pointer['path']).read_text();assert 'project_status' in other_contents and str(other) in other_contents
 print('Native TUI verified: ResearchPi header, real SDK chat, naming, new conversation, cross-project conversation selector and persisted resume pointer.')
finally:
 if p.poll() is None:p.kill();p.wait()
 os.close(master);shutil.rmtree(project)
