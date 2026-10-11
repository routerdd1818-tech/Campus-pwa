import re

path = "Campus v1/Views/Schedule/TodayOverviewView.swift"
with open(path, "r") as f:
    content = f.read()

content = content.replace("""                    // 已完成事項
                    ForEach(completedTodos) { todo in
                        todoRow(todo: todo, isDone: true)
                    }""", """                    // 隱藏已完成事項 (User request)
                    // ForEach(completedTodos) { todo in
                    //     todoRow(todo: todo, isDone: true)
                    // }""")

with open(path, "w") as f:
    f.write(content)
