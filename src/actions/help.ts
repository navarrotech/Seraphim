// Copyright © 2025 Jalapeno Labs

export function showHelp() {
  console.log(`
# Seraphim

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
`.trim()
  )
}
