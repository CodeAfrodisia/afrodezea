import{r as l,s as d,j as a,t as q}from"./index-Cfo4WONF.js";function x({userId:s,quizSlug:t}){const[u,n]=l.useState(null),[o,m]=l.useState("");return l.useEffect(()=>{let i=!0;return(async()=>{try{let e=d.from("quiz_attempts").select(`
            id,
            result_title,
            result_summary,
            completed_at,
            is_public,
            quiz:quiz_id ( id, slug, title )
          `).eq("user_id",s).eq("is_public",!0).order("completed_at",{ascending:!1}).limit(1);t&&(e=e.eq("quiz.slug",t));const{data:p,error:c}=await e;if(c)throw c;let r=p?.[0]||null;if(!r&&t){const{data:f}=await d.from("quiz_attempts").select(`
              id,
              result_title,
              result_summary,
              completed_at,
              is_public,
              quiz:quiz_id ( id, slug, title )
            `).eq("user_id",s).eq("is_public",!0).order("completed_at",{ascending:!1}).limit(20);r=(f||[]).find(_=>_?.quiz?.slug===t)||null}if(!i)return;n(r||null)}catch(e){if(!i)return;m(e.message||"Could not load quiz attempt.")}})(),()=>{i=!1}},[s,t]),o?a.jsxs("div",{style:{opacity:.8},children:["Error: ",o]}):u?a.jsx(q,{attempt:u}):a.jsx("div",{style:{opacity:.8},children:"No public results yet."})}export{x as default};
