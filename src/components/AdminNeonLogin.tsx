import { useState } from 'react';
import { createAuthClient } from '@neondatabase/neon-js/auth';
import { Notice } from './shared';
type Props={onLogin:(token:string)=>void};
async function client(){const response=await fetch('/api/admin-auth-config',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Autenticação indisponível.');return createAuthClient(data.url)}
export default function AdminNeonLogin({onLogin}:Props){
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [otp,setOtp]=useState('');const [mode,setMode]=useState<'login'|'reset'>('login');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setMessage('');setBusy(true);try{
  const auth=await client();
  if(mode==='reset'){const result=await auth.emailOtp.resetPassword({email,otp,password});if(result.error)throw new Error('Não foi possível alterar a senha. Confira o código e tente novamente.');setMode('login');setPassword('');setOtp('');setMessage('Senha atualizada. Entre com seu e-mail e a nova senha.');return;}
  const login=await auth.signIn.email({email,password});if(login.error)throw new Error('Não foi possível entrar. Confira o e-mail e a senha.');
  let jwt:string|null=null;const session=await auth.getSession({fetchOptions:{onSuccess(ctx){jwt=ctx.response.headers.get('set-auth-jwt');}}});
  if(session.error||!jwt)throw new Error('Não foi possível validar a sessão. Verifique a configuração do Neon Auth.');
  const check=await fetch('/api/admin/featured',{headers:{Authorization:`Bearer ${jwt}`},cache:'no-store'});if(!check.ok)throw new Error('Conta sem acesso administrativo ou e-mail ainda não verificado.');
  setPassword('');onLogin(jwt);
 }catch(e){setError(e instanceof Error?e.message:'Falha ao entrar.')}finally{setBusy(false)}}
 async function requestCode(){setError('');setMessage('');if(!email){setError('Informe seu e-mail para receber o código.');return;}setBusy(true);try{const auth=await client();const result=await auth.emailOtp.requestPasswordReset({email});if(result.error)throw new Error('Não foi possível enviar o código. Confirme se o envio por e-mail está habilitado no Neon Auth.');setMode('reset');setMessage('Se a conta estiver disponível, consulte seu e-mail para obter o código.');}catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar o código.')}finally{setBusy(false)}}
 return <><form onSubmit={submit}><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{mode==='reset'&&<label>Código recebido<input inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={e=>setOtp(e.target.value)}/></label>}<label>{mode==='reset'?'Nova senha':'Senha'}<input type="password" autoComplete={mode==='reset'?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="admin-primary" disabled={busy}>{busy?'Aguarde…':mode==='reset'?'Definir senha':'Entrar com e-mail'}</button><button type="button" onClick={mode==='login'?requestCode:()=>{setMode('login');setError('');setMessage('')}} disabled={busy}>{mode==='login'?'Receber código para definir ou recuperar senha':'Voltar para o login'}</button></form>{error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}</>;
}
