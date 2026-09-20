const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches, fine=matchMedia('(pointer:fine)').matches;
setTimeout(()=>{$('#boot').classList.add('hide')},1500);

/* Cursor + physics-like trail */
const cur=$('.cursor i'), ring=$('.cursor b'), glow=$('.page-glow'), cube=$('#cube');
let x=innerWidth/2,y=innerHeight/2,rx=x,ry=y,trail=[];
addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;cur.style.left=x+'px';cur.style.top=y+'px';});
(function loop(){rx+=(x-rx)*.17;ry+=(y-ry)*.17;ring.style.left=rx+'px';ring.style.top=ry+'px';if(!reduced&&fine){trail.push({x,y,a:1});if(trail.length>14)trail.shift();}requestAnimationFrame(loop)})();
$$('a,button,.tilt,.skill-node,.project').forEach(el=>{el.addEventListener('mouseenter',()=>ring.classList.add('hover'));el.addEventListener('mouseleave',()=>ring.classList.remove('hover'))});

/* Scroll reveal */
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');observer.unobserve(e.target)}}),{threshold:.12});
$$('.reveal').forEach((e,i)=>{e.style.transitionDelay=(i%5*.06)+'s';observer.observe(e)});

/* Progress + career line */
addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;$('.progress').style.width=(scrollY/max*100)+'%';const exp=$('.experience'),line=$('.career-line i');if(exp){const r=exp.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight-r.top)/(r.height*.75)));line.style.height=(p*100)+'%'}});

/* Magnetic */
if(fine&&!reduced) $$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.18}px)`});el.addEventListener('pointerleave',()=>el.style.transform='')});

/* Tilt */
if(fine&&!reduced) $$('.tilt').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),px=e.clientX/r.width-r.left/r.width,py=e.clientY/r.height-r.top/r.height;el.style.transform=`perspective(900px) rotateX(${-(py-.5)*7}deg) rotateY(${(px-.5)*7}deg) translateY(-3px)`});el.addEventListener('pointerleave',()=>el.style.transform='')});

/* 3D hero reacts to pointer */
if(fine&&!reduced) $('#hero3d').addEventListener('pointermove',e=>{const r=e.currentTarget.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;cube.style.transform=`rotateX(${-py*35}deg) rotateY(${35+px*55}deg)`});
if(fine&&!reduced) $('#hero3d').addEventListener('pointerleave',()=>cube.style.transform='rotateX(-20deg) rotateY(35deg)');

/* Counters */
$$('[data-count]').forEach(el=>{const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;let t=+el.dataset.count,s=performance.now();function tick(n){let p=Math.min(1,(n-s)/900);el.textContent=Math.round(t*(1-(1-p)**3));if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick);io.disconnect()}),{threshold:.7});io.observe(el)});

/* Terminal + live GitHub integration + browser Linux shell simulator */
const terminal=$('#terminalBody'), input=$('#terminalInput');
const GITHUB_USER='Souvik-Pramanik';
const GITHUB_API='https://api.github.com';
let githubCache=null;
const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const formatDate=value=>{if(!value)return '—';const d=new Date(value);const days=Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));if(days===0)return 'today';if(days===1)return '1d ago';if(days<30)return `${days}d ago`;if(days<365)return `${Math.floor(days/30)}mo ago`;return `${Math.floor(days/365)}y ago`};
const iconForEvent=t=>({PushEvent:'↑',CreateEvent:'＋',WatchEvent:'★',ForkEvent:'⑂',IssuesEvent:'!',IssueCommentEvent:'◌',PullRequestEvent:'⇄',ReleaseEvent:'◈',DeleteEvent:'×'}[t]||'·');
const eventText=e=>{const repo=escapeHTML(e.repo?.name||'repository');const action={PushEvent:'pushed commits to',CreateEvent:'created',WatchEvent:'starred',ForkEvent:'forked',IssuesEvent:'updated an issue in',IssueCommentEvent:'commented on',PullRequestEvent:'updated a pull request in',ReleaseEvent:'published a release in',DeleteEvent:'deleted'}[e.type]||'updated';if(e.type==='CreateEvent')return `${action} <strong>${repo}</strong>`;if(e.type==='PushEvent'){const count=e.payload?.size||e.payload?.commits?.length||1;return `pushed <strong>${count} commit${count===1?'':'s'}</strong> to <strong>${repo}</strong>`}return `${action} <strong>${repo}</strong>`};
async function githubFetch(path){const r=await fetch(`${GITHUB_API}${path}`,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error(`GitHub API ${r.status}`);return r.json()}
function renderGithub(data){const {profile,repos,events}=data;$('#githubName').textContent=profile.name||profile.login||GITHUB_USER;$('#githubBio').textContent=profile.bio||'Public GitHub profile — repositories, activity and engineering work.';$('#githubUpdated').textContent=`SYNCED ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;$('#githubStats').innerHTML=[[profile.public_repos,'REPOSITORIES'],[profile.followers,'FOLLOWERS'],[profile.following,'FOLLOWING'],[(repos||[]).reduce((sum,r)=>sum+(r.stargazers_count||0),0),'REPO STARS']].map(([n,l])=>`<div class="gh-stat"><b>${escapeHTML(n)}</b><span>${l}</span></div>`).join('');const reposEl=$('#githubRepos');const visible=repos.filter(r=>!r.fork).slice(0,6);reposEl.innerHTML=visible.length?visible.map(r=>`<article class="repo-card"><div class="repo-main"><div class="repo-name">${escapeHTML(r.name)}</div><p class="repo-desc">${escapeHTML(r.description||'No repository description provided.')}</p><div class="repo-meta"><span>${r.language?`<b>${escapeHTML(r.language)}</b>`:'<b>CODE</b>'}</span><span>★ ${escapeHTML(r.stargazers_count)}</span><span>⑂ ${escapeHTML(r.forks_count)}</span><span>${formatDate(r.updated_at)}</span></div></div><a class="repo-open" href="${escapeHTML(r.html_url)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(r.name)}">↗</a></article>`).join(''):`<div class="github-empty">No public repositories available to display.</div>`;const activityEl=$('#githubActivity');const ev=events.filter(e=>['PushEvent','CreateEvent','WatchEvent','ForkEvent','IssuesEvent','IssueCommentEvent','PullRequestEvent','ReleaseEvent','DeleteEvent'].includes(e.type)).slice(0,7);activityEl.innerHTML=ev.length?ev.map(e=>`<div class="activity-item"><div class="activity-icon">${iconForEvent(e.type)}</div><div class="activity-copy">${eventText(e)}<span class="activity-time">${escapeHTML(formatDate(e.created_at))}</span></div></div>`).join(''):`<div class="github-empty">No recent public activity is available from the GitHub Events API.</div>`}
async function loadGithub(force=false){if(githubCache&&!force){renderGithub(githubCache);return githubCache}const reposEl=$('#githubRepos'),activityEl=$('#githubActivity');reposEl.innerHTML='<div class="github-loading"><i></i> Fetching repositories…</div>';activityEl.innerHTML='<div class="github-loading"><i></i> Fetching activity…</div>';try{const [profile,repos,events]=await Promise.all([githubFetch(`/users/${GITHUB_USER}`),githubFetch(`/users/${GITHUB_USER}/repos?per_page=100&sort=updated&direction=desc&type=owner`),githubFetch(`/users/${GITHUB_USER}/events/public?per_page=12`)]);githubCache={profile,repos,events};renderGithub(githubCache);return githubCache}catch(err){reposEl.innerHTML='<div class="github-error">GitHub public data could not be loaded right now.<br><br><button type="button" id="githubRetry">RETRY</button> · <a href="https://github.com/Souvik-Pramanik" target="_blank" rel="noreferrer">OPEN GITHUB</a></div>';activityEl.innerHTML='<div class="github-empty">The live activity feed is temporarily unavailable. The profile link remains available above.</div>';$('#githubRetry')?.addEventListener('click',()=>loadGithub(true));throw err}}

/* A safe, deterministic Linux shell simulation. It never executes host commands. */
const shell={cwd:'/home/souvik',history:[],histIndex:0,files:{'/home/souvik':['projects','scripts','README.md','resume.pdf','.bashrc'], '/home/souvik/projects':['weather-app','facemask-detection','quantum-image-processing'], '/home/souvik/scripts':['deploy.sh','backup.sh','healthcheck.sh'], '/etc':['hostname','os-release','hosts','nginx','ssh'], '/var/log':['syslog','auth.log','nginx'], '/tmp':[], '/opt':['devops-lab'], '/usr/bin':['bash','cat','cd','chmod','chown','curl','docker','echo','find','git','grep','head','ip','journalctl','kubectl','ls','mkdir','nano','nginx','ping','ps','python3','rm','sed','ssh','sudo','systemctl','tar','terraform','top','touch','tr','uname','vim','wget','whoami','xargs']},dirs:new Set(['/','/home','/home/souvik','/home/souvik/projects','/home/souvik/scripts','/etc','/etc/nginx','/etc/ssh','/var','/var/log','/tmp','/opt','/opt/devops-lab','/usr','/usr/bin'])};
const home='/home/souvik';
function normalizePath(path){if(!path)return shell.cwd;let base=path.startsWith('/')?path:shell.cwd+'/'+path;const out=[];for(const part of base.split('/')){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part)}return '/'+out.join('/')}
function parentOf(p){const n=normalizePath(p);if(n==='/')return '/';return n.slice(0,n.lastIndexOf('/'))||'/'}
function basename(p){const n=normalizePath(p);return n==='/'?'/':n.slice(n.lastIndexOf('/')+1)}
function fileExists(p){const n=normalizePath(p);return shell.dirs.has(n)||Object.prototype.hasOwnProperty.call(shell.files,n)||Object.values(shell.files).some(a=>a.includes(basename(n))&&parentOf(n)===p)}
function dirEntries(dir){dir=normalizePath(dir);const set=new Set(shell.files[dir]||[]);shell.dirs.forEach(d=>{if(d!==dir&&parentOf(d)===dir)set.add(basename(d))});return [...set].sort((a,b)=>a.localeCompare(b))}
function styledLines(lines){return lines.map(x=>escapeHTML(x)).join('\n')}
function commandList(){return `Core Linux: ls · cd · pwd · cat · less · more · head · tail · touch · mkdir · rm · rmdir · cp · mv · ln · find · locate · grep · egrep · sed · awk · cut · sort · uniq · tr · wc · xargs · tee\nSystem: uname · hostname · whoami · id · uptime · date · cal · env · printenv · which · whereis · type · ps · top · free · df · du · mount · lsblk · lscpu · lsusb · lspci · dmesg\nNetwork: ip · ifconfig · ping · curl · wget · ss · netstat · traceroute · nslookup · dig · hostnamectl\nServices: systemctl · service · journalctl · nginx\nDevOps: git · docker · kubectl · helm · terraform · ansible · ssh · scp\nFiles/archives: chmod · chown · tar · gzip · zip · unzip\nShell: echo · printf · history · clear · reset · alias · export · source · man · help · neofetch · exit\nPortfolio: about · devops · cloud · experience · projects · skills · github · contact`}
const commandAliases={ll:'ls -la',la:'ls -a',l:'ls -lah',cls:'clear',ff:'neofetch',vi:'vim'};
function fakeFileContent(path){path=normalizePath(path);const map={
'/etc/hostname':'souvik-devops',
'/etc/os-release':'NAME="Ubuntu"\nVERSION="24.04 LTS (Noble Numbat)"\nID=ubuntu\nID_LIKE=debian\nPRETTY_NAME="Ubuntu 24.04 LTS"',
'/etc/hosts':'127.0.0.1 localhost\n127.0.1.1 souvik-devops',
'/etc/nginx/nginx.conf':'# nginx configuration (portfolio simulation)\nevents {}\nhttp { include mime.types; server { listen 80; } }',
'/etc/ssh':'# directory',
'/var/log/syslog':'Sep 15 06:45:01 souvik-devops systemd[1]: Started portfolio simulation.\nSep 15 06:46:12 souvik-devops kernel: Network interface ready.\nSep 15 06:47:33 souvik-devops nginx[421]: server started.',
'/var/log/auth.log':'Sep 15 06:40:02 sshd: Accepted publickey for souvik\nSep 15 06:42:17 sudo: session opened',
'/var/log/nginx':'2026/09/15 06:47:33 [notice] nginx started'};return map[path]??null}
function neofetch(){return `<span class="green">       .---.          </span> souvik@portfolio\n<span class="green">      /     \\         </span> ------------------\n<span class="green">      \\.@-@./         </span> OS: Ubuntu 24.04 LTS (sim)\n<span class="green">      /\\_/\\          </span> Host: Souvik DevOps OS\n<span class="green">     //  _  \\         </span> Kernel: 6.8.0-portfolio\n<span class="green">    | \\     )|        </span> Uptime: ${Math.floor(performance.now()/60000)} mins\n<span class="green">   /'\\_   _/\\        </span> Shell: bash 5.2 (simulator)\n<span class="green">   \\___)=(___/        </span> Resolution: ${innerWidth}x${innerHeight}\n                         CPU: Virtual x86_64\n                         Memory: 16 GiB (virtual)\n                         Theme: SOUVIK.OS\n                         Terminal: WebShell\n                         DevOps: AWS · Docker · CI/CD`}
function parseArgs(line){const re=/(?:[^\s"']+|"[^"]*"|'[^']*')+/g;return (line.match(re)||[]).map(x=>x.replace(/^['"]|['"]$/g,''))}
function pathArg(a){return normalizePath(a==='~'?home:a.startsWith('~/')?home+a.slice(1):a)}
function linuxCommand(raw){let line=raw.trim();if(!line)return '';if(commandAliases[line])line=commandAliases[line];const args=parseArgs(line),cmd=args.shift()?.toLowerCase();if(!cmd)return '';if(cmd==='sudo')return `<span class="muted">[sudo] password for souvik:</span> <span class="muted">(interactive password input disabled in portfolio simulator)</span>`;
switch(cmd){
case 'help':return commandList();case 'man':return args[0]?`MANUAL: ${args[0]}\nThis portfolio shell provides a safe browser simulation of ${args[0]}. Type help for supported commands.`:'What manual page do you want?';case 'neofetch':return neofetch();case 'clear':case 'reset':return '__CLEAR__';case 'exit':return 'logout\n[Process completed — portfolio shell remains open]';
case 'pwd':return shell.cwd;case 'whoami':return 'souvik';case 'hostname':return 'souvik-devops';case 'hostnamectl':return 'Static hostname: souvik-devops\nOperating System: Ubuntu 24.04 LTS (simulation)\nKernel: Linux 6.8.0-portfolio\nArchitecture: x86-64';case 'uname':return args.includes('-a')?'Linux souvik-devops 6.8.0-portfolio #1 SMP x86_64 GNU/Linux':args.includes('-r')?'6.8.0-portfolio':'Linux';case 'id':return 'uid=1000(souvik) gid=1000(souvik) groups=1000(souvik),27(sudo),998(docker)';case 'date':return new Date().toString();case 'cal':return new Date().toLocaleString('en-US',{month:'long',year:'numeric'});case 'uptime':return ` ${new Date().toLocaleTimeString()} up ${Math.max(1,Math.floor(performance.now()/3600000))}:${String(Math.floor(performance.now()/60000)%60).padStart(2,'0')}, 1 user, load average: 0.18, 0.22, 0.19`;case 'env':case 'printenv':return 'HOME=/home/souvik\nUSER=souvik\nSHELL=/bin/bash\nLANG=en_US.UTF-8\nTERM=xterm-256color\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\nEDITOR=vim\nDEVOPS_MODE=enabled';case 'which':case 'whereis':case 'type':return args.map(a=>`/usr/bin/${a}`).join('\n')||'bash is /usr/bin/bash';
case 'ls':{let target=shell.cwd,showAll=false,long=false,human=false;for(const a of args){if(a.startsWith('-')){showAll|=a.includes('a');long|=a.includes('l');human|=a.includes('h')}else target=pathArg(a)}const entries=dirEntries(target);if(!long)return entries.filter(e=>showAll||!e.startsWith('.')).map(e=>{const full=normalizePath(target+'/'+e);return shell.dirs.has(full)?`<span class="green">${escapeHTML(e)}/</span>`:escapeHTML(e)}).join('  ')||'';return entries.filter(e=>showAll||!e.startsWith('.')).map(e=>{const full=normalizePath(target+'/'+e),dir=shell.dirs.has(full);return `${dir?'drwxr-xr-x':'-rw-r--r--'} 1 souvik souvik ${dir?'4096':' '+String((e.length*731)%9000+128).padStart(4)} Sep 15 06:45 ${dir?`<span class="green">${escapeHTML(e)}/</span>`:escapeHTML(e)}`}).join('\n')}
case 'cd':{const dest=pathArg(args[0]||home);if(shell.dirs.has(dest)){shell.cwd=dest;return ''}return `bash: cd: ${escapeHTML(args[0]||'')}: No such file or directory`}
case 'cat':case 'less':case 'more':{if(!args.length)return `${cmd}: missing operand`;return args.map(a=>{const p=pathArg(a),c=fakeFileContent(p);if(c!==null)return escapeHTML(c);if(shell.dirs.has(p))return `cat: ${escapeHTML(a)}: Is a directory`;return `cat: ${escapeHTML(a)}: No such file or directory`}).join('\n')}
case 'head':case 'tail':{const nArg=args.find(a=>a.startsWith('-n='))?.split('=')[1]||args.find(a=>/^-[0-9]+$/.test(a))?.slice(1)||'10';const f=args.find(a=>!a.startsWith('-'));const c=f?fakeFileContent(pathArg(f)):null;return c?escapeHTML((cmd==='head'?c.split('\n').slice(0,+nArg):c.split('\n').slice(-+nArg)).join('\n')):`${cmd}: cannot open input file`}
case 'touch':case 'mkdir':{if(!args.length)return `${cmd}: missing operand`;for(const a of args.filter(x=>!x.startsWith('-'))){const p=pathArg(a);if(cmd==='mkdir'){shell.dirs.add(p);shell.files[p]=shell.files[p]||[]}else{shell.files[parentOf(p)]=shell.files[parentOf(p)]||[];if(!shell.files[parentOf(p)].includes(basename(p)))shell.files[parentOf(p)].push(basename(p))}}return ''}
case 'rm':case 'rmdir':{const targets=args.filter(a=>!a.startsWith('-'));if(!targets.length)return `${cmd}: missing operand`;targets.forEach(a=>{const p=pathArg(a);shell.dirs.delete(p);const par=parentOf(p);if(shell.files[par])shell.files[par]=shell.files[par].filter(x=>x!==basename(p))});return ''}
case 'cp':case 'mv':{if(args.length<2)return `${cmd}: missing file operand`;return `${cmd}: ${escapeHTML(args[0])} → ${escapeHTML(args.at(-1))} (simulated)`}
case 'ln':return 'symbolic link created (simulated)';case 'chmod':case 'chown':return `${cmd}: operation completed in simulation`;case 'echo':return args.join(' ');case 'printf':return args.join(' ').replace(/\\n/g,'\n');case 'history':return shell.history.map((h,i)=>`${String(i+1).padStart(4)}  ${escapeHTML(h)}`).join('\n')||'No history';case 'alias':return 'alias ll="ls -la"\nalias la="ls -a"\nalias l="ls -lah"';case 'export':return args.join(' ')||'declare -x';case 'source':return 'Environment reloaded (simulation)';
case 'grep':case 'egrep':{const pat=args.find(a=>!a.startsWith('-'));const f=args.find(a=>a!==pat&&!a.startsWith('-'));const c=f?fakeFileContent(pathArg(f)):'Linux DevOps Cloud Docker Kubernetes Terraform';if(!pat)return `${cmd}: missing pattern`;return escapeHTML((c||'').split('\n').filter(l=>l.toLowerCase().includes(pat.toLowerCase())).join('\n'))||''}
case 'find':{const base=args.find(a=>!a.startsWith('-'))||shell.cwd;const nameIdx=args.indexOf('-name');const name=nameIdx>=0?args[nameIdx+1]:null;const list=[...shell.dirs].filter(d=>d.startsWith(pathArg(base))).concat(Object.keys(shell.files).filter(k=>k.startsWith(pathArg(base))));return [...new Set(list)].filter(p=>!name||basename(p).match(new RegExp('^'+name.replaceAll('*','.*')+'$'))).slice(0,30).join('\n')}
case 'wc':return args.map(a=>{const c=fakeFileContent(pathArg(a))||'';return `${c.split('\n').length} ${c.split(/\s+/).filter(Boolean).length} ${c.length} ${a}`}).join('\n');case 'sort':return args.length?args.sort().join('\n'):'stdin simulation';case 'uniq':return 'unique lines emitted (stdin simulation)';case 'cut':case 'tr':case 'sed':case 'awk':case 'xargs':case 'tee':return `${cmd}: text-processing pipeline executed (simulation)`;
case 'ps':return 'PID TTY          TIME CMD\n  1 ?        00:00:02 systemd\n421 ?        00:00:00 nginx\n517 pts/0    00:00:00 bash\n622 pts/0    00:00:00 portfolio-shell';case 'top':return 'top - 06:45:12 up 3:21,  1 user,  load average: 0.18, 0.22, 0.19\nTasks: 42 total, 1 running, 41 sleeping\n%Cpu(s): 3.2 us, 1.1 sy, 95.7 id\nMiB Mem : 16384 total, 9216 free, 4096 used, 3072 buff/cache\nPID USER   %CPU %MEM COMMAND\n421 souvik  1.2  0.4 nginx\n622 souvik  0.8  0.2 portfolio-shell';case 'free':return '              total        used        free      shared  buff/cache   available\nMem:       16777216     4194304     9437184      524288     3145728    12582912\nSwap:       2097152           0     2097152';case 'df':return 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sim-root    100G   31G   69G  31% /\ntmpfs             8G  512K    8G   1% /tmp';case 'du':return '12K\t./scripts\n48M\t./projects\n52M\t.';case 'mount':return '/dev/sim-root on / type ext4 (rw,relatime)\ntmpfs on /tmp type tmpfs (rw,nosuid,nodev)';case 'lsblk':return 'NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT\nsda      8:0    0  100G  0 disk\n└─sda1   8:1    0  100G  0 part /';case 'lscpu':return 'Architecture: x86_64\nCPU(s): 4\nModel name: Virtual DevOps CPU\nVirtualization: full\nL1d cache: 128 KiB';case 'lsusb':return 'Bus 001 Device 001: Linux Foundation root hub (simulation)';case 'lspci':return '00:00.0 Ethernet controller: Virtual Network Adapter\n00:02.0 VGA compatible controller: Virtual Display';case 'dmesg':return '[    0.000000] Linux version 6.8.0-portfolio\n[    1.201223] network interface initialized\n[    2.113501] docker bridge ready';
case 'ip':case 'ifconfig':return '1: lo: <LOOPBACK,UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500\n    inet 192.168.1.42/24 brd 192.168.1.255 scope global eth0';case 'ss':case 'netstat':return 'Netid State  Local Address:Port  Process\ntcp   LISTEN 0.0.0.0:22       sshd\ntcp   LISTEN 0.0.0.0:80       nginx\ntcp   LISTEN 127.0.0.1:3000 portfolio';case 'ping':return args[0]?`PING ${escapeHTML(args[0])} (93.184.216.34) 56(84) bytes of data.\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=57 time=18.4 ms\n64 bytes from 93.184.216.34: icmp_seq=2 ttl=57 time=17.9 ms\n--- ${escapeHTML(args[0])} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`:'ping: missing host operand';case 'curl':case 'wget':return args.find(a=>a.startsWith('http'))?`HTTP/1.1 200 OK\nserver: nginx\ncontent-type: text/html\nx-devops-simulated: true\n\n[remote response simulated in portfolio shell]`:`${cmd}: missing URL`;case 'traceroute':return `traceroute to ${escapeHTML(args[0]||'example.com')}\n 1  192.168.1.1  2.1 ms\n 2  10.0.0.1  8.4 ms\n 3  93.184.216.34  18.7 ms`;case 'nslookup':case 'dig':return `Server: 192.168.1.1\nName: ${escapeHTML(args[0]||'example.com')}\nAddress: 93.184.216.34`;
case 'systemctl':case 'service':{const svc=args.find(a=>['nginx','docker','ssh','ssh.service','nginx.service'].includes(a));return svc?`${svc.replace('.service','')}.service - active (running)\n   Loaded: loaded (/lib/systemd/system/${svc.replace('.service','')}.service)\n   Active: active (running) since today; 2h ago`:'Usage: systemctl status|start|stop|restart <service>'}case 'journalctl':return '-- Logs begin at today --\nSep 15 06:42:01 souvik-devops systemd[1]: Started docker.service.\nSep 15 06:43:22 souvik-devops systemd[1]: Started nginx.service.';case 'nginx':return 'nginx: configuration test is successful (simulation)';
case 'git':return `git ${args[0]||'status'}\n${args[0]==='status'?'On branch main\nYour branch is up to date with origin/main.\nworking tree clean':'Git command simulated. Use github for live profile data.'}`;
case 'docker':{const sub=args[0]||'ps';if(sub==='ps')return 'CONTAINER ID   IMAGE        STATUS          PORTS\na81c2d1        nginx:alpine Up 2 hours      0.0.0.0:80->80/tcp\nb19f4e2        node:22      Up 48 minutes   3000/tcp';if(sub==='images')return 'REPOSITORY    TAG       IMAGE ID      SIZE\nnginx         alpine    a1b2c3d4      43MB\nnode          22        e5f6a7b8      1.1GB';return `docker ${escapeHTML(args.slice(1).join(' '))} completed (simulation)`}case 'kubectl':{const sub=args[0]||'get';if(sub==='get')return 'NAME                         READY   STATUS    AGE\npod/portfolio-api-7c8d9      1/1     Running   2h\npod/nginx-ingress            1/1     Running   3h';return `kubectl ${escapeHTML(args.join(' '))} completed (simulation)`}case 'helm':return 'NAME    NAMESPACE  REVISION  UPDATED   STATUS\nportfolio default    3         today     deployed';case 'terraform':return args[0]==='plan'?`Terraform will perform the following actions:\n  + aws_instance.web\n  + aws_s3_bucket.assets\nPlan: 2 to add, 0 to change, 0 to destroy.\n\n(simulated — no cloud resources are modified)`:'Terraform command available: init · plan · validate · apply · destroy (simulation)';case 'ansible':return 'ansible-playbook: 3 tasks simulated, 3 ok, 0 changed, 0 failed';case 'ssh':case 'scp':return `${cmd}: connection simulation only — no external host is contacted.`;
case 'tar':case 'gzip':case 'zip':case 'unzip':return `${cmd}: archive operation completed (simulation)`;case 'nano':case 'vim':return `${cmd}: interactive editor is represented by this portfolio shell; file editing is simulated.`;
case 'about':return 'Souvik Pramanik — Cloud / DevOps Engineer in progress. CSE graduate with strong Linux, Bash and networking foundations.';case 'devops':return 'TARGET: Cloud / DevOps Engineer\nFOCUS: Linux · Docker · CI/CD · Cloud · Automation\nBUILD: Dedicated DevOps project in development';case 'cloud':return 'AWS: EC2 · S3 · IAM · CloudWatch · Lambda · ECS · EKS\nAzure: Intermediate\nKubernetes / Terraform / Ansible / Observability: learning';case 'experience':return '2026 → IT Executive / ERP & systems\n2025 → Field Support Engineer\n2024 → Full Stack Web + Penetration Testing';case 'projects':return '01 Animated Weather Application\n02 Facemask Detection using Python + ML\n03 Quantum Image Morphological Operation';case 'skills':return 'LINUX (ADV) · BASH (ADV) · NETWORKING (ADV) · GIT (INT) · DOCKER (INT) · AWS (INT) · AZURE (INT) · PYTHON (INT) · K8S (BEG) · TERRAFORM (BEG)';case 'github':{return loadGithub().then(d=>`LIVE GITHUB\n${d.profile.public_repos} public repositories · ${d.profile.followers} followers\n\n${d.repos.filter(r=>!r.fork).slice(0,5).map((r,i)=>`${String(i+1).padStart(2,'0')} ${r.name} · ${r.language||'CODE'} · ★${r.stargazers_count}`).join('\n')||'No public repositories found.'}\n\nOPEN: github.com/Souvik-Pramanik`)}case 'contact':return 'Email: snaptokon@proton.me\nGitHub: github.com/Souvik-Pramanik\nLinkedIn: linkedin.com/in/nukebyte';default:return `bash: ${escapeHTML(cmd)}: command not found\nType <span class="green">help</span> to see supported commands.`}}
function renderTerminal(out){if(out==='__CLEAR__'){terminal.innerHTML='';return}terminal.insertAdjacentHTML('beforeend',`<div class="result">${typeof out==='string'?out.replace(/\n/g,'<br>'):String(out).replace(/\n/g,'<br>')}</div>`)}
async function runCommand(cmd){cmd=cmd.trim();if(!cmd)return;const display=cmd;terminal.insertAdjacentHTML('beforeend',`<div class="cmd">souvik@portfolio:${escapeHTML(shell.cwd)}$ ${escapeHTML(display)}</div>`);shell.history.push(display);shell.histIndex=shell.history.length;try{let out;if(/^ask\s+/i.test(display)){const q=display.replace(/^ask\s+/i,'').trim();renderTerminal(await askAI(q,{silentUser:true}));out='AI response sent to assistant panel.'}else{out=linuxCommand(display);if(out&&typeof out.then==='function'){out=await out}}if(out!==undefined)renderTerminal(out)}catch(err){terminal.insertAdjacentHTML('beforeend',`<div class="result error">shell: ${escapeHTML(err.message||'command failed')}</div>`)}terminal.scrollTop=terminal.scrollHeight}
$('#terminalForm').addEventListener('submit',e=>{e.preventDefault();runCommand(input.value);input.value=''});
input.addEventListener('keydown',e=>{if(e.key==='ArrowUp'){e.preventDefault();shell.histIndex=Math.max(0,shell.histIndex-1);input.value=shell.history[shell.histIndex]||''}if(e.key==='ArrowDown'){e.preventDefault();shell.histIndex=Math.min(shell.history.length,shell.histIndex+1);input.value=shell.history[shell.histIndex]||''}if(e.key==='Tab'){e.preventDefault();const val=input.value.trim(),parts=val.split(/\s+/),prefix=parts.at(-1)||'';const candidates=commandList().split(/ · |\n/).flatMap(x=>x.split(': ')).filter(Boolean);const matches=[...new Set([...Object.keys(commandAliases),...['help','neofetch','about','devops','cloud','experience','projects','skills','github','contact','clear'],...candidates])].filter(x=>x.startsWith(prefix));if(matches.length===1)input.value=parts.slice(0,-1).concat(matches[0]).join(' ')+' '}});
$$('.terminal-help button').forEach(b=>b.onclick=()=>runCommand(b.dataset.cmd));
$('#githubRefresh')?.addEventListener('click',()=>loadGithub(true));
loadGithub().catch(()=>{});

/* Skill network SVG connections */
const network=$('#network'),svg=network.querySelector('svg'),nodes=$$('.skill-node');
function drawNetwork(){svg.innerHTML='';const nr=network.getBoundingClientRect(),cr=$('.skill-center').getBoundingClientRect();const cx=cr.left-nr.left+cr.width/2,cy=cr.top-nr.top+cr.height/2;nodes.forEach((n,i)=>{const r=n.getBoundingClientRect(),nx=r.left-nr.left+r.width/2,ny=r.top-nr.top+r.height/2;let l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',cx);l.setAttribute('y1',cy);l.setAttribute('x2',nx);l.setAttribute('y2',ny);l.dataset.i=i;svg.appendChild(l)})}
addEventListener('load',drawNetwork);addEventListener('resize',drawNetwork);
nodes.forEach((n,i)=>{n.addEventListener('mouseenter',()=>{nodes.forEach(x=>x.classList.remove('active'));n.classList.add('active');[...svg.querySelectorAll('line')].forEach(l=>l.style.stroke=+l.dataset.i===i?'#d8ff45':'#252a22')});n.addEventListener('mouseleave',()=>{n.classList.remove('active');[...svg.querySelectorAll('line')].forEach(l=>l.style.stroke='')})});

/* Project case files */
const data={
weather:{k:'01 / FLUTTER · DEC 2024',t:'Animated Weather Application',d:'A feature-rich Flutter application designed around real-time weather updates and a detailed 7-day forecast.',items:[['CORE','Flutter application'],['INTERACTION','Dynamic weather animations'],['LOCATION','GPS-based tracking'],['DATA','Real-time + 7-day forecast']]},
ml:{k:'02 / PYTHON · ML · 2023',t:'Facemask Detection',d:'A machine-learning project focused on identifying whether individuals in images are wearing facemasks.',items:[['DOMAIN','Machine Learning'],['LANGUAGE','Python'],['INPUT','Images'],['OUTPUT','Mask / no-mask classification']]},
quantum:{k:'03 / IMAGE PROCESSING · 2023',t:'Quantum Image Morphological Operation',d:'An exploration of image sharpening and restoration using quantum and classical image-processing techniques.',items:[['DOMAIN','Image Processing'],['APPROACH','Quantum + classical'],['GOAL','Sharpening'],['GOAL 2','Restoration']]}
};
$$('.open-project').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const d=data[btn.closest('.project').dataset.project];$('#modalContent').innerHTML=`<div class="case-kicker">${d.k}</div><h2>${d.t}</h2><p>${d.d}</p><div class="case-grid">${d.items.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div><p style="margin-top:30px">This case file is a portfolio summary. Add your repository, screenshots, demo URL or architecture diagram here when those assets are available.</p>`;$('#modal').classList.add('open')});
$('#modalClose').onclick=()=>$('#modal').classList.remove('open');$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').classList.remove('open')};

/* View modes — one information architecture, three visual personalities */
const modeBtn=$('#modeBtn'),panel=$('#modePanel'),modeTransition=$('#modeTransition'),modeLabel=$('#modeTransitionLabel'),modeBadge=$('#modeBadge'),modeHint=$('#modeHint');
const modeNames={os:'DIGITAL OS',recruiter:'RECRUITER',developer:'DEVELOPER'};
const modeHints={os:'SYSTEM INTERFACE',recruiter:'CAREER SIGNAL',developer:'ENGINEERING CONSOLE'};
let currentMode='os';
function applyMode(mode,animate=true){
  if(!modeNames[mode]) return;
  const changed=mode!==currentMode; currentMode=mode;
  document.body.classList.remove('mode-os','mode-recruiter','mode-developer');
  document.body.classList.add('mode-'+mode);
  document.body.dataset.view=mode;
  modeBtn.innerHTML=`VIEW: <b>${modeNames[mode].split(' ')[0]}</b>`;
  modeHint.textContent=modeHints[mode];
  modeBadge.querySelector('b').textContent=modeNames[mode];
  panel.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  if(animate&&changed&&!reduced){
    modeLabel.textContent=`SWITCHING TO ${modeNames[mode]}`;
    modeTransition.classList.remove('play'); void modeTransition.offsetWidth; modeTransition.classList.add('play');
  }
  // Recalculate the skill graph because visual mode changes can alter dimensions.
  requestAnimationFrame(()=>{drawNetwork(); window.scrollTo({top:scrollY,behavior:'instant'});});
}
modeBtn.onclick=e=>{e.stopPropagation();panel.classList.toggle('open')};
panel.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();applyMode(b.dataset.mode);panel.classList.remove('open')});
document.addEventListener('click',e=>{if(!panel.contains(e.target)&&e.target!==modeBtn)panel.classList.remove('open')});
addEventListener('keydown',e=>{if(e.key==='Escape')panel.classList.remove('open')});
applyMode('os',false);

/* Easter egg: Konami */
const seq=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let pos=0;
addEventListener('keydown',e=>{if(e.key===seq[pos]||e.key.toLowerCase()===seq[pos]){pos++;if(pos===seq.length){$('#easter').classList.add('open');pos=0}}else pos=0});
$('#easterClose').onclick=()=>$('#easter').classList.remove('open');

/* Background particle field */
const c=$('#bgCanvas'),ctx=c.getContext('2d');let W,H,ps=[];
function resize(){W=c.width=innerWidth;H=c.height=innerHeight;ps=Array.from({length:Math.min(75,Math.floor(innerWidth/17))},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.2+.3}))}resize();addEventListener('resize',resize);
function draw(){ctx.clearRect(0,0,W,H);if(!reduced){for(const p of ps){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;ctx.fillStyle='#d8ff4540';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){let a=ps[i],b=ps[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<110){ctx.strokeStyle=`rgba(216,255,69,${.055*(1-d/110)})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}requestAnimationFrame(draw)}draw();

/* Keyboard shortcut / */
addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();input.focus()}});


/* ===== Advanced DevOps modules ===== */
function scrollToId(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})}
$$('.cc-action').forEach(b=>b.addEventListener('click',()=>scrollToId(b.dataset.target)));

/* Cloud architecture explorer */
const cloudInfo={
 github:['GitHub','Source control and repository hosting.','SOURCE'],
 actions:['GitHub Actions','Automation layer for build, test and deployment workflows.','CI / CD'],
 docker:['Docker','Container packaging layer for reproducible application delivery.','CONTAINER'],
 aws:['AWS','Cloud platform used across Souvik’s current learning/experience stack.','CLOUD'],
 ec2:['Amazon EC2','Virtual compute instances — listed as hands-on AWS experience.','COMPUTE'],
 ecs:['Amazon ECS','Managed container orchestration service — listed as AWS experience.','CONTAINERS'],
 eks:['Amazon EKS','Managed Kubernetes service — listed as AWS experience; Kubernetes remains a learning area.','KUBERNETES'],
 s3:['Amazon S3','Object storage — listed as AWS experience.','STORAGE'],
 iam:['AWS IAM','Identity and access management — listed as AWS experience.','ACCESS'],
 cloudwatch:['Amazon CloudWatch','Monitoring and observability service — listed as AWS experience.','OBSERVE']
};
const cloudMap=$('#cloudMap'), cloudInspector=$('#cloudInspector');
function drawCloudLines(){if(!cloudMap)return;const svg=cloudMap.querySelector('svg'), nodes=[...cloudMap.querySelectorAll('.cloud-node')];svg.setAttribute('viewBox',`0 0 ${cloudMap.clientWidth} ${cloudMap.clientHeight}`);const pairs=[['github','actions'],['actions','docker'],['docker','aws'],['aws','ec2'],['aws','ecs'],['aws','eks'],['aws','s3'],['aws','iam'],['aws','cloudwatch']];svg.innerHTML='';for(const [a,b] of pairs){const A=cloudMap.querySelector(`[data-cloud="${a}"]`),B=cloudMap.querySelector(`[data-cloud="${b}"]`);if(!A||!B)continue;const ar=A.getBoundingClientRect(),br=B.getBoundingClientRect(),rr=cloudMap.getBoundingClientRect();const l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',ar.left+ar.width/2-rr.left);l.setAttribute('y1',ar.top+ar.height/2-rr.top);l.setAttribute('x2',br.left+br.width/2-rr.left);l.setAttribute('y2',br.top+br.height/2-rr.top);svg.appendChild(l)}}
function selectCloud(key){const info=cloudInfo[key];if(!info)return;cloudMap.querySelectorAll('.cloud-node').forEach(n=>n.classList.toggle('active',n.dataset.cloud===key));cloudInspector.innerHTML=`<span class="inspector-kicker">${escapeHTML(info[2])}</span><h3>${escapeHTML(info[0])}</h3><p>${escapeHTML(info[1])}</p><div class="inspector-data"><span>ROLE</span><b>${escapeHTML(info[2])}</b></div>`;}
cloudMap?.querySelectorAll('.cloud-node').forEach(n=>n.addEventListener('click',()=>selectCloud(n.dataset.cloud)));addEventListener('resize',drawCloudLines);addEventListener('load',drawCloudLines);setTimeout(drawCloudLines,80);

/* CI/CD builder */
function buildPipeline(){const vals=[$('#pipeSource').value,$('#pipeBuild').value,$('#pipeContainer').value,$('#pipeDeploy').value,$('#pipeObserve').value];const labels=[['SOURCE',vals[0]],['BUILD',vals[1]],['TEST','Automated tests'],['PACKAGE',vals[2]],['DEPLOY',vals[3]],['OBSERVE',vals[4]]];const path=$('#pipelinePath');path.innerHTML='';labels.forEach((x,i)=>{if(x[0]==='PACKAGE'&&x[1]==='None')return;if(i)path.insertAdjacentHTML('beforeend','<div class="pipe-arrow">→</div>');path.insertAdjacentHTML('beforeend',`<div class="pipe-step"><span>${escapeHTML(x[0])}</span><b>${escapeHTML(x[1])}</b><small>${i===0?'repository':i===1?'application':'delivery stage'}</small></div>`)});}
$('#generatePipeline')?.addEventListener('click',buildPipeline);buildPipeline();

/* Live GitHub analytics */
function renderAnalytics(data){const repos=(data.repos||[]).filter(r=>!r.fork);$('#analyticsRepoCount').textContent=data.profile.public_repos??repos.length;$('#analyticsFollowers').textContent=data.profile.followers??'—';$('#analyticsFollowing').textContent=data.profile.following??'—';$('#analyticsStars').textContent=repos.reduce((n,r)=>n+(r.stargazers_count||0),0);const top=[...repos].sort((a,b)=>(b.stargazers_count||0)-(a.stargazers_count||0))[0];$('#analyticsTopRepo').textContent=top?.name||'—';const counts={};repos.forEach(r=>{if(r.language)counts[r.language]=(counts[r.language]||0)+1});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6),max=sorted[0]?.[1]||1;$('#languageBars').innerHTML=sorted.length?sorted.map(([lang,n])=>`<div class="bar-row"><span class="bar-label">${escapeHTML(lang)}</span><span class="bar-track"><i style="width:${Math.max(8,n/max*100)}%"></i></span><span class="bar-value">${n}</span></div>`).join(''):'<div class="bar-empty">Language data unavailable.</div>';}
const previousLoadGithub=loadGithub;loadGithub=async function(force=false){const d=await previousLoadGithub(force);renderAnalytics(d);return d};
setTimeout(()=>{if(githubCache)renderAnalytics(githubCache)},2500);

/* Docker playground */
const dockerOutput=$('#dockerOutput');let dockerRunning=true;
function dockerLine(html){dockerOutput.insertAdjacentHTML('beforeend',`<div>${html}</div>`);dockerOutput.scrollTop=dockerOutput.scrollHeight}
$$('[data-docker]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.docker;if(a==='ps')dockerLine('<span class="ok">CONTAINER ID   IMAGE   STATUS</span><br>8c12a1   nginx   Up 4 minutes<br>4be913   python  Up 2 minutes');if(a==='run'){dockerRunning=true;dockerLine('<span class="ok">→</span> created container <b>web</b> from nginx:latest');}if(a==='logs')dockerLine('<span class="ok">GET / 200</span> · GET /health 200 · listening :80');if(a==='stop'){dockerRunning=false;dockerLine('<span class="ok">→</span> container web stopped (simulation)')}}));

/* Terraform lab */
$('#tfPlan')?.addEventListener('click',()=>{$('#tfResult').classList.add('ready');$('#tfResult').textContent='+ 1 to add, 0 to change, 0 to destroy · aws_instance.web · aws_s3_bucket.assets';});
$('#tfApply')?.addEventListener('click',()=>{$('#tfResult').classList.add('ready');$('#tfResult').textContent='Apply complete! Resources provisioned in simulation only.';});

/* ===== Advanced AI DevOps Assistant v6 ===== */
const AI_API_BASE=(window.SOUVIK_AI_API_BASE||'').replace(/\/$/,'');
const aiState={mode:'explain',history:[],busy:false,lastQuestion:'',lastAnswer:''};
const aiScreen=$('#aiScreen'),aiInput=$('#aiInput'),aiStatus=$('#aiStatus'),aiModel=$('#aiModel'),aiLatency=$('#aiLatency');
function aiEndpoint(path){return `${AI_API_BASE}${path}`}
function formatAI(text){
  const safe=escapeHTML(text);
  const blocks=[];let html=safe.replace(/```([\w+-]*)\n?([\s\S]*?)```/g,(_,lang,code)=>{blocks.push(`<pre><code>${code.trim()}</code></pre>`);return `@@CODE${blocks.length-1}@@`});
  html=html.replace(/^### (.+)$/gm,'<h4>$1</h4>').replace(/^## (.+)$/gm,'<h4>$1</h4>').replace(/^# (.+)$/gm,'<h4>$1</h4>');
  html=html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
  html=html.replace(/^[-*] (.+)$/gm,'• $1').replace(/\n/g,'<br>');
  blocks.forEach((b,i)=>{html=html.replace(`@@CODE${i}@@`,b)});
  return html;
}
function aiAppend(role,text,meta=''){
  const node=document.createElement('div');node.className=`ai-msg ${role}`;node.innerHTML=formatAI(text)+(meta?`<div class="ai-meta">${escapeHTML(meta)}</div>`:'');aiScreen.appendChild(node);aiScreen.scrollTop=aiScreen.scrollHeight;return node;
}
function setAIStatus(label,online=false){if(aiStatus){aiStatus.textContent=label;aiStatus.style.color=online?'var(--a)':''}}
async function aiHealth(){
  try{const r=await fetch(aiEndpoint('/api/health'));if(!r.ok)throw new Error('offline');const d=await r.json();setAIStatus(d.aiConfigured?'AI BACKEND ONLINE':'BACKEND ONLINE / KEY REQUIRED',d.aiConfigured);if(aiModel)aiModel.textContent=`MODEL: ${d.model||'—'}`;return d}catch{setAIStatus('BACKEND OFFLINE / CONFIGURE API');return null}
}
async function askAI(question,{silentUser=false}={}){
  const q=String(question||'').trim();if(!q||aiState.busy)return;
  aiState.busy=true;aiState.lastQuestion=q;const started=performance.now();
  if(!silentUser)aiAppend('user',q);const thinking=aiAppend('bot','THINKING…');setAIStatus('AI PROCESSING…');aiLatency.textContent='RUNNING';
  try{
    const r=await fetch(aiEndpoint('/api/ask'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,history:aiState.history,mode:aiState.mode,liveWeb:Boolean($('#aiLiveWeb')?.checked)})});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);
    thinking.remove();aiAppend('bot',data.answer,`${data.liveWeb?'LIVE WEB · ':''}${data.model||'AI'} · ${Math.round(performance.now()-started)}ms`);aiState.history.push({role:'user',content:q},{role:'assistant',content:data.answer});aiState.history=aiState.history.slice(-12);aiState.lastAnswer=data.answer;setAIStatus('AI BACKEND ONLINE',true);aiModel.textContent=`MODEL: ${data.model||'—'}`;aiLatency.textContent=`${Math.round(performance.now()-started)}ms`;return data.answer;
  }catch(err){thinking.remove();aiAppend('bot',`AI request failed: ${err.message}\n\nStart the secure backend and configure GEMINI_API_KEY on the server. The browser must never contain your secret key.`);setAIStatus('AI UNAVAILABLE');aiLatency.textContent='ERROR';throw err}
  finally{aiState.busy=false}
}
$$('[data-ai-mode]').forEach(b=>b.addEventListener('click',()=>{$$('[data-ai-mode]').forEach(x=>x.classList.toggle('active',x===b));aiState.mode=b.dataset.aiMode}));
$('#aiClear')?.addEventListener('click',()=>{aiState.history=[];aiState.lastQuestion='';aiState.lastAnswer='';aiScreen.innerHTML='<div class="ai-msg bot"><strong>CONVERSATION CLEARED</strong><br>Ask a new DevOps question.</div>';aiLatency.textContent='READY'});
$('#aiForm')?.addEventListener('submit',e=>{e.preventDefault();const q=aiInput.value.trim();aiInput.value='';askAI(q)});
$$('[data-ai-prompt]').forEach(b=>b.addEventListener('click',()=>{const q=b.dataset.aiPrompt;aiInput.value=q;askAI(q); }));
aiHealth();

/* Recruiter mode upgrade: auto-scroll to high-signal sections and focus the quick scan */
const originalApplyMode=applyMode;
applyMode=function(mode,animate=true){originalApplyMode(mode,animate);if(mode==='recruiter'){document.documentElement.style.setProperty('--mode-accent','#1e6b4a');setTimeout(()=>document.querySelector('.recruiter-snapshot')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'}),220)}else{document.documentElement.style.setProperty('--mode-accent','#d8ff45')}};
