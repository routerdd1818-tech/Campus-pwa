import os

path = "Campus v1/Views/Components/CampusComponents.swift"
with open(path, "r") as f:
    content = f.read()

if "func hideKeyboard" not in content:
    content += "\n\nextension View {\n    func hideKeyboard() {\n        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)\n    }\n}\n"
    with open(path, "w") as f:
        f.write(content)
