fx_version "adamant"

description "Mg Store | mg-whitelistcode"
author "MG"
version "1.0.0"
lua54 "yes"
game "gta5"

server_script {
    'server.lua',
}

server_scripts { '@mysql-async/lib/MySQL.lua' }