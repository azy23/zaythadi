Zaythadi (ဈေးသတိ) — UI ပြန်လည်ဒီဇိုင်း Package
=================================================

ဒီ package မှာ ပါဝင်တဲ့ဖိုင်များ
- index.html            ပင်မစာမျက်နှာနှင့် ဈေးနှုန်းတင်ပြဖောင်
- styles.css            Google လို အရောင်စုံ၊ ဖုန်း/ကွန်ပျူတာလိုက်ဖက်သော UI
- app.js                Supabase မှ ဈေးနှုန်းဖတ်ခြင်း၊ တင်ပြခြင်း၊ အကျဉ်းချုပ်တွက်ခြင်း
- config.js             လက်ရှိ Supabase project URL နှင့် public key
- manifest.webmanifest  PWA အချက်အလက်
- service-worker.js     အခြေခံ cache/offline shell

အရေးကြီး — Database မဖျက်ပါ
----------------------------
ဒီ package က browser-side ဖိုင်များသာဖြစ်ပြီး Supabase table၊ record၊ policy များကို
ဖျက်ခြင်း/ပြောင်းလဲခြင်း မလုပ်ပါ။ လက်ရှိ public.price_reports table ကိုပဲ အသုံးပြုပါတယ်.

GitHub Pages တင်နည်း
--------------------
1. ZIP ကို extract လုပ်ပါ.
2. GitHub ရှိ zaythadi repository ကို ဖွင့်ပါ.
3. အရင် version ကို ပြန်ထားလိုပါက GitHub မှာ commit အသစ်မလုပ်မီ လက်ရှိဖိုင်များကို backup လုပ်ပါ.
4. index.html, styles.css, app.js, config.js, manifest.webmanifest, service-worker.js ကို repository root ထဲတင်ပါ.
5. GitHub Pages ကို main branch / (root) အတိုင်းထားပါ.
6. website ကို ဖွင့်ပြီး hard refresh လုပ်ပါ (PC: Ctrl+F5; mobile: browser cache ရှင်းခြင်း သို့မဟုတ် ခဏစောင့်ပြီး ပြန်ဖွင့်ခြင်း).

Supabase public key စစ်ဆေးရန်
-----------------------------
config.js ထဲမှာ Supabase URL ကို လက်ရှိ project URL အတိုင်း ထည့်ထားပါတယ်.
public publishable/anon key က သင့်လက်ရှိအလုပ်လုပ်နေတဲ့ dashboard.js မှာ အသုံးပြုထားတဲ့
key နဲ့ တူကြောင်း အတည်ပြုပါ။ မတူပါက config.js ရှိ supabaseKey ကို အဲဒီ PUBLIC key နဲ့
အစားထိုးပါ။ service_role / secret key ကို ဘယ်တော့မှ browser ဖိုင်ထဲ မထည့်ပါနဲ့.

စမ်းသပ်ရန် checklist
--------------------
[ ] ပင်မစာမျက်နှာဖွင့်ပြီး မြို့နယ်များ/ဈေးနှုန်းများ ပေါ်လာသလား
[ ] ဈေးတက်/ဈေးကျ/တည်ငြိမ်/ပစ္စည်းရှား ကတ်များကို နှိပ်လို့ရသလား
[ ] စမ်းသပ်တင်ပြချက်တစ်ခု တင်ပြီး Supabase table ထဲ ဝင်သလား
[ ] အခြား browser/device မှာ တင်ပြချက်ကို မြင်ရသလား
[ ] ဖုန်းမျက်နှာပြင်မှာ ဖောင်နဲ့ ခလုတ်တွေ သေချာမြင်ရသလား

မှတ်ချက်
-------
- ဒီ package က ဈေးကွက်ကို အလိုအလျောက် အတည်ပြုခြင်း/ခန့်မှန်းခြင်း မလုပ်ပါ။ ပြသသည့်အချက်များသည်
  community submissions ဖြစ်သည်။
- ဒီ build မှာ chart မထည့်ထားပါ။
- Google Fonts အတွက် အင်တာနက်လိုနိုင်ပါတယ်; system fallback font ရှိပါတယ်.
- လက်ရှိ market-news/rumor localStorage feature ကို ဒီအလွယ်တကူအသုံးပြုနိုင်သော UI build ထဲမှာ
  မထည့်ထားပါ။ အရင် build ကို backup လုပ်ထားပြီး လိုအပ်ရင် နောက်အဆင့်မှာ ပြန်ပေါင်းနိုင်ပါတယ်.
