import { useId } from "react";

// Original vector artwork. No sacred text, stock graphics or competitor assets.
export function StudyIllustration({kind="book",className=""}:{kind?:"book"|"audio"|"notes"|"chat"|"practice";className?:string}) {
  const id=useId().replace(/:/g,"");
  return <svg className={`study-drawing ${className}`} viewBox="0 0 560 420" fill="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-paper`} x1="160" y1="70" x2="440" y2="340" gradientUnits="userSpaceOnUse"><stop stopColor="#fffefa"/><stop offset="1" stopColor="#eee6d7"/></linearGradient><linearGradient id={`${id}-amber`} x1="370" y1="85" x2="430" y2="330" gradientUnits="userSpaceOnUse"><stop stopColor="#e6aa71"/><stop offset="1" stopColor="#c0794f"/></linearGradient></defs>
    <ellipse cx="290" cy="352" rx="165" ry="20" fill="#293957" opacity=".07"/>
    <path className="drawing-loop" d="M110 150C29 223 101 337 243 341c175 5 294-93 258-183-18-45-75-66-103-63" stroke="#c4a588" strokeWidth="1.4" strokeDasharray="4 8"/>
    {kind==="book"||kind==="notes"?<>
      <g transform="rotate(-7 280 216)">
        <path d="M111 119c74-10 122 2 170 33 41-33 90-42 167-34v189c-64-8-110 7-167 37-48-29-102-40-170-35V119Z" fill="#c79b6d" stroke="#26364d" strokeWidth="2"/>
        <path d="M115 110c70-5 119 3 166 38 47-35 90-43 162-37l-3 187c-70-4-114 9-159 40-46-30-95-43-166-37V110Z" fill={`url(#${id}-paper)`} stroke="#26364d" strokeWidth="2"/>
        <path d="M124 99c66-1 115 9 157 42 43-30 94-41 111-37l-4 187c-56 1-105 13-146 43-41-31-92-43-157-42V99Z" fill="#fffaf0" stroke="#26364d" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M281 141v189" stroke="#26364d" strokeWidth="2"/>
        <path d="M137 129c50 3 87 13 122 33M137 153c52 5 91 17 122 35M137 179c48 5 82 13 118 33M137 204c50 5 80 13 118 32M137 230c51 5 82 14 118 32M137 256c46 3 87 16 118 31M306 167c32-15 62-22 96-21M306 191c32-15 62-22 96-21M306 217c32-15 62-22 96-21M306 244c32-15 62-22 96-21M306 270c32-15 62-22 96-21" stroke="#bcb6a9" strokeWidth="1.2"/>
        <path d="M359 104v145l17-14 16 12V104" fill={`url(#${id}-amber)`} stroke="#a46845"/>
        <path className="drawing-underline" d="m138 176 115 31" stroke="#e3ac67" strokeWidth="10" strokeLinecap="round" opacity=".4"/>
      </g>
      <g className="drawing-pencil" transform="rotate(24 419 263)"><path d="M414 191h14v126l-7 22-7-22V191Z" fill="#d69965" stroke="#26364d" strokeWidth="1.5"/><path d="M419 203h4v111h-4z" fill="#f6d3a5"/><path d="m414 317 7 22 7-22" fill="#f3e3c8" stroke="#26364d" strokeWidth="1.5"/><path d="m418 331 3 8 3-8" fill="#26364d"/><path d="M414 191v-10c0-8 14-8 14 0v10" fill="#d1d8e4" stroke="#26364d" strokeWidth="1.5"/></g>
      <g className="drawing-sound" stroke="#314565" strokeLinecap="round" strokeWidth="2"><path d="M108 77v20m8-26v31m8-37v43m8-33v27m8-18v10M459 288v20m8-26v32m8-39v44m8-32v24"/></g>
    </>:kind==="audio"?<>
      <g transform="rotate(-7 280 213)"><rect x="168" y="83" width="214" height="259" rx="29" fill="#e6c3a0" stroke="#26364d" strokeWidth="2"/><rect x="180" y="94" width="192" height="237" rx="23" fill={`url(#${id}-paper)`} stroke="#26364d" strokeWidth="2"/><rect x="198" y="115" width="156" height="101" rx="8" fill="#e7ecee" stroke="#536279"/><g stroke="#405476" strokeWidth="4" strokeLinecap="round">{[20,32,50,68,38,76,60,28,52,44,30].map((h,i)=><path className="drawing-audio-bar" key={i} d={`M${219+i*12} ${165-h/2}v${h}`} style={{animationDelay:`${i*.08}s`}}/>)}</g><circle cx="231" cy="264" r="21" fill="#d0d9e4" stroke="#26364d"/><path d="m228 255 11 9-11 9v-18Z" fill="#314565"/><circle cx="314" cy="264" r="24" fill="#d2996d" stroke="#26364d"/><circle cx="314" cy="264" r="9" fill="#794629"/><path d="M225 314h89" stroke="#999d9f" strokeWidth="2"/></g><path d="M132 154c-25 39-24 67 0 106m285-139c25 36 27 72 3 110" stroke="#aab4c4" strokeWidth="2" strokeLinecap="round"/>
    </>:kind==="chat"?<>
      <g transform="rotate(-5 263 220)"><path d="M128 110h290a17 17 0 0 1 17 17v121a17 17 0 0 1-17 17H239l-46 36 8-36h-73a17 17 0 0 1-17-17V127a17 17 0 0 1 17-17Z" fill={`url(#${id}-paper)`} stroke="#26364d" strokeWidth="2"/><path d="M143 146h173m-173 21h237m-237 21h207" stroke="#b3bac0" strokeWidth="3" strokeLinecap="round"/><rect x="143" y="216" width="88" height="25" rx="12" fill="#e5c69f"/><path d="m159 223 9 6-9 6v-12Z" fill="#314565"/><path d="M181 229h29" stroke="#314565" strokeWidth="2" strokeLinecap="round"/></g><g className="drawing-small-card" transform="rotate(8 368 295)"><rect x="284" y="251" width="181" height="79" rx="13" fill="#314565" stroke="#26364d" strokeWidth="2"/><path d="M307 274h130m-130 16h105m-105 16h121" stroke="#e0e3e9" strokeWidth="2" strokeLinecap="round"/></g>
    </>:<>
      <g transform="rotate(-11 266 219)"><rect x="164" y="113" width="216" height="214" rx="12" fill="#d7b58e" stroke="#26364d" strokeWidth="2"/></g><g transform="rotate(5 287 207)"><rect x="168" y="96" width="223" height="223" rx="12" fill="#cad4df" stroke="#26364d" strokeWidth="2"/></g><g className="drawing-small-card" transform="rotate(-3 283 207)"><rect x="165" y="83" width="229" height="229" rx="12" fill={`url(#${id}-paper)`} stroke="#26364d" strokeWidth="2"/><path d="M193 113h25" stroke="#c28d5d" strokeWidth="3"/><path d="M193 150h166m-166 20h147m-147 20h104" stroke="#b3bac0" strokeWidth="3" strokeLinecap="round"/><rect x="193" y="229" width="173" height="46" rx="8" fill="#e4e9e5" stroke="#6d8275"/><circle cx="218" cy="252" r="12" fill="#788d7e"/><path d="m212 252 4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M245 252h91" stroke="#65776a" strokeWidth="2"/></g><path d="M414 131c34 26 32 54 15 79m-1-3-4 8 13-2" stroke="#314565" strokeWidth="2" strokeLinecap="round"/>
    </>}
    <g stroke="#9f7554" strokeWidth="1.5" strokeLinecap="round"><path d="m89 295 13 4m-7-8 2 12M449 63l10 2m-5-7-1 12M72 184h6"/><circle cx="391" cy="365" r="3"/><circle cx="470" cy="245" r="2"/></g>
  </svg>;
}
