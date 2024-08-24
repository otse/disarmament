REM simpler than wamp / xampp / and things like www folders

start "" http://localhost:2
http-server . -p 2 -c-1 -S -C cert.pem -o