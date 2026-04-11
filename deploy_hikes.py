# Import deploy function and call it with my app name
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'deployment-tools')))
from deploy import deploy
deploy("hikes", os.path.join(os.path.dirname(os.path.abspath(__file__)), "webroot"))