#!/bin/bash

# This is a generic deployment script copied into various projects.

# It reads its setting from local, project unique, .deploy-config-<target>.sh files; not checked into git.
# <target> is the deployment target, e.g. "prod" , "test", "dev" or whatever

# usage: ./deploy.sh <target>

# It syncs all of ./webroot content to the specified destination.
# Remote files are *not* deleted by default, delete manually if needed.

# deploy-config.sh holds environment/project specific settings:
# DEPLOY_LOC = <location of deployed site, e.g. http://example.com>
# DEPLOY_TYPE = <local | ftp>   # This controls the transfer method, local file copying or FTP upload.

# DEPLOY_TYPE:
#     local:
#         The local web root is copied (using rsync) to the specified destination
#         DEPLOY_DST = <local web root>
#     ftp:
#         The files are uploaded to the specified FTP server;
#         DEPLOY_HOST = <ftp server>
#         DEPLOY_USER = <ftp user>
#         DEPLOY_PASS = <ftp password>
#         DEPLOY_DST = <ftp destination path>

# Easiest way to get started is just to call it with a non-existing target if it will prompt for creating a corresponing prefilled template file to ef

CFG_FILE=".deploy-config-$1.sh"

# If the config file does not exist, ask if one should be created
if [ ! -f "$CFG_FILE" ]; then
    echo "No $CFG_FILE found."
    echo "Do you want to create one? (y/n)"
    read answer
    if [ "$answer" == "y" ]; then
        cat > "$CFG_FILE" <<'DEPLOY_CONFIG_EOF'
#!/bin/bash
# Deployment configuration
# Edit this file, choose one of the deploy types, and fill relevant settings
DEPLOY_LOC="http://example.com"

DEPLOY_TYPE="local"
DEPLOY_DST="/path/to/local/web/root"

DEPLOY_TYPE="ftp"
DEPLOY_HOST="ftp.example.com"
DEPLOY_USER="ftpuser"
DEPLOY_PASS="ftppassword"
DEPLOY_DST="/path/to/ftp/destination"
DEPLOY_CONFIG_EOF
        echo "$CFG_FILE file created. Please edit it with your deployment settings."
        exit 1
    else
        echo "Please create a $CFG_FILE file with your deployment settings."
        exit 1
    fi
fi

source ./"$CFG_FILE"

SRC_DIR="./webroot"

echo "Target location: $DEPLOY_LOC"

if [ "$DEPLOY_TYPE" == "local" ]; then
    echo "Deploying to local web root: $DEPLOY_DST"
    # rsync -av:
    #   -a preserves attributes and syncs directories recursively (archive mode)
    #   -v prints transferred files (verbose)
    rsync -av $SRC_DIR $DEPLOY_DST
elif [ "$DEPLOY_TYPE" == "ftp" ]; then
    echo "Deploying to FTP server: $DEPLOY_HOST"

    # mirror -v -R = verbose reverse mirror:
    #    upload local SRC_DIR to remote DEPLOY_DST,
    #    adding/updating changed files on the server
    lftp -u $DEPLOY_USER,$DEPLOY_PASS $DEPLOY_HOST <<EOF
mirror -v -R $SRC_DIR $DEPLOY_DST
bye
EOF
else
    echo "Unknown DEPLOY_TYPE: $DEPLOY_TYPE"
    echo "Fix your $CFG_FILE file."
    exit 1
fi

