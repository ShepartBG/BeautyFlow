# BeautyFlow Auth писма

Тези файлове са готови за поставяне в Supabase Dashboard → Authentication → Email Templates. Качването им в Git само по себе си не променя писмата на Supabase.

- **Reset Password**: тема `BeautyFlow — задаване на нова парола`; съдържание `recovery.html`.
- **Invite User**: тема `BeautyFlow — покана за специалист`; съдържание `invite.html`.

Запазете `{{ .ConfirmationURL }}` дословно. Настройте в Supabase Authentication → URL Configuration публичния `Site URL` и позволения redirect `https://www.beautyflow.bg/reset-password` (и използвания домейн без www, ако е необходим). Проверете с тестови акаунти реалното получаване и бутоните. Ако използвате собствен SMTP, задайте подателя на проверения домейн BeautyFlow.
