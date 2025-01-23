# arduino_handler.py
from pyfirmata import Arduino, util
import time
import sys
import json
import traceback

class ArduinoHandler:
    def __init__(self):
        self.board = None
        self.connected = False
        self.led = None

    def handle_command(self):
        while True:
            try:
                # Read command from stdin (sent by Electron)
                command_str = input()
                command = json.loads(command_str)
                
                if command['command'] == 'connect':
                    response = self.connect(command['port'])
                elif command['command'] == 'execute':
                    response = self.execute_code(command['code'])
                elif command['command'] == 'cleanup':
                    response = self.cleanup()
                    break
                
                # Send response back to Electron
                print(json.dumps(response))
                sys.stdout.flush()
                
            except Exception as e:
                error_response = {
                    "success": False,
                    "message": f"Command handling error: {str(e)}"
                }
                print(json.dumps(error_response))
                sys.stdout.flush()

    def connect(self, port):
        try:
            # Initialize connection to Arduino
            self.board = Arduino(port)
            
            # Start iterator thread for reading analog pins
            it = util.Iterator(self.board)
            it.start()
            
            # Configure built-in LED
            self.led = self.board.get_pin('d:13:o')
            self.connected = True
            
            return {
                "success": True,
                "message": f"Successfully connected to Arduino on {port}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to connect to Arduino: {str(e)}"
            }

    def execute_code(self, code_string):
        if not self.connected:
            return {
                "success": False,
                "message": "Not connected to Arduino"
            }

        try:
            # First, try to compile the code to check for syntax errors
            compiled_code = compile(code_string, '<string>', 'exec')
            
            # Create a safe namespace with only necessary objects
            namespace = {
                'board': self.board,
                'led': self.led,
                'time': time,
                'OUTPUT': self.board.OUTPUT,
                'INPUT': self.board.INPUT,
                'PWM': self.board.PWM,
                'SERVO': self.board.SERVO
            }
            
            # Execute the compiled code in the restricted namespace
            exec(compiled_code, namespace)
            
            return {
                "success": True,
                "message": "Code executed successfully"
            }
        except SyntaxError as e:
            return {
                "success": False,
                "message": f"Syntax error in Python code: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Runtime error: {str(e)}\n{traceback.format_exc()}"
            }

    def cleanup(self):
        try:
            if self.led:
                self.led.write(0)  # Turn off LED
            if self.board:
                self.board.exit()
            return {
                "success": True,
                "message": "Cleanup successful"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Cleanup error: {str(e)}"
            }

if __name__ == "__main__":
    handler = ArduinoHandler()
    handler.handle_command()