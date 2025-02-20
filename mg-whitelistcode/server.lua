local oxmysql = exports.oxmysql

local function generateAuthCode(callback)
    local charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    
    local function generateCode()
        local code = ""
        for i = 1, 5 do
            local randIndex = math.random(1, #charset)
            code = code .. string.sub(charset, randIndex, randIndex)
        end
        return "YOUR_SERVER_NAME" .. code
    end

    local function checkCode()
        local newCode = generateCode()
        oxmysql:execute("SELECT authkey FROM mg_whitelistcode WHERE authkey = ?", {newCode}, function(result)
            if result and #result > 0 then
                checkCode()
            else
                callback(newCode)
            end
        end)
    end

    checkCode()
end

AddEventHandler("playerConnecting", function(name, setCallback, deferrals)
    local playerId = source
    local identifiers = GetPlayerIdentifiers(playerId)

    local licenseId = nil
    local lastIp = "null"
    local discordId = "null"

    deferrals.defer()
    Wait(200)

    print(identifiers)
    for _, id in ipairs(identifiers) do
        if string.sub(id, 1, 8) == "discord:" then
            discordId = id
            print(id)
        end
        if string.sub(id, 1, 3) == "ip:" then
            lastIp = id
            print(id)
        end
        if string.sub(id, 1, 8) == "license:" then
            licenseId = id
        end
    end

    if not licenseId then
        deferrals.done("License kimliğiniz bulunamadı! Lütfen Rockstar hesabınızı bağlayarak tekrar deneyin.")
        return
    end

    oxmysql:execute("SELECT whitelist, authkey FROM mg_whitelistcode WHERE license = ?", {licenseId}, function(result)
        if result and #result > 0 then
            local whitelist = result[1].whitelist
            local authkey = result[1].authkey
            if whitelist == 1 then
                deferrals.done()
            else
                deferrals.done("<br>Whitelistin bulunmuyor lütfen <span style='color:#5865F2;'>discord.gg/24GX8fmZee</span> üzerinden whitelist alınız/ekleyiniz.<br>" ..
               "Whitelist kodunuz: <span style='color:lime; font-weight:bold;'>" .. authkey .. "</span> eklemeyi bilmiyor iseniz <span style='color:#5865F2;'>#Whitelist-eşle</span> odasına bakabilirsiniz<br>" ..
               "<span style='color:deepskyblue;'>Dev by MG Store</span>")
            end
        else
            generateAuthCode(function(newCode)
                oxmysql:execute("INSERT INTO mg_whitelistcode (license, authkey, lastip, discordid, whitelist) VALUES (?, ?, ?, ?, 0)", {licenseId, newCode, lastIp, discordId})
                deferrals.done("<br>Whitelistiniz yok ise <span style='color:#5865F2;'>discord.gg/24GX8fmZee</span> izerinden Whitelist alabilirsiniz <br>" ..
                "Whitelistiniz bulunuyor ise <span style='color:lime; font-weight:bold;'>" .. newCode .. "</span> kodunu eşliyerek giriş sağlıyabilirsiniz <span style='color:#5865F2;'>#Whitelist-eşle</span> odasına bakabilirsiniz <br>" ..
                "<span style='color:deepskyblue;'>Dev by MG Store</span>")
            end)
        end
    end)
end)


local CurrentVersion = GetResourceMetadata(GetCurrentResourceName(), "version", 0) or "v1.0.0"
local expectedResourceName = "mg-whitelistcode" 

if GetCurrentResourceName() ~= expectedResourceName then
    print("^1Please do not change the folder name ! '" .. expectedResourceName .. "' ")
end

local function checkVersion()
    PerformHttpRequest("https://api.github.com/repos/Mg-Store/mg-whitelistsystem/releases/latest", function(statusCode, response)
        local NewVersion = statusCode == 200 and json.decode(response).tag_name or nil
        if NewVersion and CurrentVersion ~= NewVersion then
            print("^1#########################################")
            print("^3[" .. expectedResourceName .. "] - New update available now!")
            print("^7Current version: ^1" .. CurrentVersion)
            print("^7New version: ^2" .. NewVersion)
            print("^3Download it now on the github: https://github.com/Mg-Store/mg-whitelistsystem/releases")
            print("^1#########################################")
        else
            print("^2Your server has the latest version.")
        end
    end, "GET", "", {["User-Agent"] = "FiveM-server"})
end

AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        checkVersion()
    end
end)