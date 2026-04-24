#!/bin/bash
# Deploy webroot/ to server using FTP.
#
# Usage: ./deploy.sh [-f]
#   -f   Actually deploy. Without -f only a dry run is performed.

set -e

# Functions

# Deploy files using lftp, passing destination parameters to the function
function deploy_ftp() {
    # $1 : host
    # $2 : user
    # $3 : pass
    # $4 : destination path
    # #5 : force run flag

    echo "${dry_prefix}Deploying $5 to $1:$4"

    cmd="$1; set ssl:verify-certificate false; mirror --reverse --delete --verbose webroot; bye"
    if [ "$5" == "-f" ]; then
        lftp -e "open -u $2,$3 $cmd"
    else
        echo "${dry_prefix}lftp -e open -u **user**, **pass** $cmd"
    fi
}

if [ ! -f "deploy_config.sh" ]; then
    echo "Error: deploy_config.sh not found."
    exit 1
fi

if ! command -v lftp &> /dev/null; then
    echo "Error: lftp is not installed. Find it at https://lftp.yar.ru/"
    exit 1
fi

source deploy_config.sh

dry_prefix="[DRY RUN] "
if [ "$1" == "-f" ]; then
    dry_prefix=""
fi

deploy_ftp "$FTP_SERVER" "$FTP_USER" "$FTP_PASS" "$FTP_DESTINATION" "$1"

echo "${dry_prefix}Done."