// Banderas vectoriales locales: no dependen del soporte de emojis de Windows.
export function CountryFlag({ code }: { code: string }) {
  const stripes: Record<string, string[]> = {
    '591': ['#d52b1e', '#f9e300', '#007934'], '54': ['#74acdf', '#fff', '#74acdf'],
    '595': ['#d52b1e', '#fff', '#0038a8'], '51': ['#d91023', '#fff', '#d91023'],
    '57': ['#fcd116', '#003893', '#ce1126'], '593': ['#ffdd00', '#034ea2', '#ed1c24'],
    '58': ['#fce300', '#003da5', '#ef3340'], '52': ['#006847', '#fff', '#ce1126'],
    '34': ['#aa151b', '#f1bf00', '#aa151b'],
  };
  const colors = stripes[code];
  return <svg aria-hidden="true" viewBox="0 0 30 20" className="h-4 w-6 shrink-0 rounded-sm border border-slate-300">
    {colors && colors.map((color, i) => <rect key={i} x={['51', '52'].includes(code) ? i * 10 : 0} y={['51', '52'].includes(code) ? 0 : i * 20 / 3} width={['51', '52'].includes(code) ? 10 : 30} height={['51', '52'].includes(code) ? 20 : 20 / 3} fill={color} />)}
    {code === '54' && <circle cx="15" cy="10" r="2" fill="#f6b40e" />}
    {code === '56' && <><path fill="#fff" d="M0 0h30v10H0z" /><path fill="#d52b1e" d="M0 10h30v10H0z" /><path fill="#0039a6" d="M0 0h10v10H0z" /><text x="5" y="8" textAnchor="middle" fontSize="8" fill="#fff">★</text></>}
    {code === '55' && <><path fill="#009739" d="M0 0h30v20H0z" /><path fill="#ffdf00" d="m15 2 12 8-12 8L3 10z" /><circle cx="15" cy="10" r="5" fill="#002776" /><path d="m11 9 8 2" stroke="#fff" /></>}
    {['1', '598'].includes(code) && <><path fill="#fff" d="M0 0h30v20H0z" />{Array.from({length:code === '1' ? 7 : 4}, (_, i) => <rect key={i} x="0" y={code === '1' ? i * 40 / 13 : 4 + i * 4} width="30" height={code === '1' ? 20 / 13 : 2} fill={code === '1' ? '#b22234' : '#0038a8'} />)}<rect width="12" height="11" fill={code === '1' ? '#3c3b6e' : '#fff'} />{code === '1' ? <text x="6" y="9" textAnchor="middle" fontSize="10" fill="#fff">★</text> : <circle cx="6" cy="5" r="3" fill="#fcd116" />}</>}
  </svg>;
}
