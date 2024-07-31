import csv

team_ids = {
    "Project Management": 2,
    "Production": 2,
    "Team Leads": 3,
    "Public Relations": 5,
    "PR": 5,
    "Programming": 6,
    "3D": 7,
    "3D Art": 7,
    "Animation": 8,
    "Texture Art": 9,
    "2D Art": 9,
    "VFX": 10,
    "VFXX": 10,
    "Concept Art": 11,
    "Music": 12,
    "Design": 13,
    "Level Design": 13,
    "Game Design": 14,
    "Sound Design": 15,
    "SFX": 15,
    "Web Dev": 16,
    "Dev Ops": 17,
    "Writing": 19,
    "Consulting": 20,
}

def handle_date(date: str) -> str:
    date = date.split("/")
    month = date[0]
    day = date[1]
    year = date[2]
    return f"{year}-{month}-{day}"

def handle_team(team: str) -> list[str]:
    team = team.replace(" Team", "")
    team = team.split("/")
    return team

def sort_key(row):
    return row[17]

roster: list[list[str | bool | int]] = []

with open("Team Roster - Main Sheet.csv", newline='') as csvfile:
    roster_reader = csv.reader(csvfile)
    skip = 3
    num = 1
    for row in roster_reader:
        if num < skip:
            num += 1
            continue
        status = row[0]
        nickname = row[1]
        date_added = handle_date(row[4])
        date_removed = row[5]
        if date_removed:
            date_removed = handle_date(date_removed)
        removal = row[7]
        credits = row[8]
        legal = row[9]
        reddit = row[10]
        email = row[12]
        time_zone = row[13]
        team_lead = row[14] == "Yes"
        teams = handle_team(row[15])
        if team_lead:
            teams.append("Team Leads")
        second_team = row[16]
        if second_team:
            teams.extend(handle_team(second_team))
        va = row[17] == "Yes"
        nda = row[18] == "Yes"
        cla = row[19] == "Yes"
        scenefusion = row[20] == "Yes"
        google = row[21]
        github = row[22]
        steamworks = row[23]
        steam = row[24]
        row = [teams, nickname, credits, legal, time_zone, status, github, nickname, google, reddit, email, steamworks, steam, va, nda, cla, scenefusion, date_added, date_removed, removal]
        roster.append(row)

def not_coms(row):
    return row[1] != "mastercoms"

roster = [x for x in roster if not_coms(x)]
roster.sort(key=sort_key)


write_str = ""
team_write_str = ""
member_id = 2
for row in roster:
    teams = row[0]
    row[0] = member_id

    for team in teams:
        team_id = team_ids[team]
        team_write_str += f"({member_id}, {team_id}),\n"

    line = "("
    for item in row:
        if item == False:
            item = "FALSE"
        elif item == True:
            item = "TRUE"
        else:
            is_string = type(item) == str
            if is_string:
                item = item.strip()
            if not item:
                item = "NULL"
            elif is_string:
                item = item.replace("'", "''")
                item = f"'{item}'"
        line += f"{item}, "
    line = line[:-2]
    line += "),"
    write_str += f"{line}\n"

    member_id += 1

with open("output.txt", "w") as file:
    file.write(write_str)

with open("team_output.txt", "w") as file:
    file.write(team_write_str)
