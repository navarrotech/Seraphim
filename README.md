# Seraphim
THIS TOOL IS CURRENTLY IN DEVELOPMENT

A tool to orchestrate global hotkeys to automated chatgpt analysis.

It combines:
- Output logs from Chrome DevTools
- Output logs from backend (Docker container logs)
- Output logs from bash or powershell stderr
- Selected text in your VSCode editor

And it can perform actions based on these logs and text selections, such as:
Ctrl + Alt = Num- = Show this help message
Ctrl + Alt + Num0 = Cancel last task on stack (TODO)
Ctrl + Alt + Num1 = Explain selected text (TODO)
Ctrl + Alt + Num2 = Suggest alternatives for selected text (TODO)
Ctrl + Alt + Num3 = Move selected function to a dedicated file (TODO)
Ctrl + Alt + Num4 = Finish writing selected function (TODO)
Ctrl + Alt + Num5 = Rewrite selected text
Ctrl + Alt + Num6 = JSDoc selection
Ctrl + Alt + Num7 = Analyze chrome/backend errors & fix
Ctrl + Alt + Num8 = 
Ctrl + Alt + Num9 = Unit Test (TODO)
Ctrl + Alt + Num+ = Copy style
Ctrl + Alt + Num* = Apply copied style to selection and complete function

# Connecting Chrome
You will need to startup Chrome with the following flag:
```
chrome --remote-debugging-port=9222
```

You can refer to this StackOverflow answer for auto-starting Chrome with the debug flag:
https://stackoverflow.com/a/56457835/9951599
