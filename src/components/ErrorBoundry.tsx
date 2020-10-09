import React from 'react';
import { Layer, Box, Text } from 'grommet';
import {
  FiXCircle as Error,
} from 'react-icons/fi';
import RaisedButton from './RaisedButton';

interface ErrorBoundaryProps {
  hasError: boolean;
  error: string;
}
export default class ErrorBoundary extends React.Component<
{},
ErrorBoundaryProps
> {
  constructor(props:any) {
    super(props);
    this.state = { hasError: false, error:'' };
  }

  static getDerivedStateFromError(error:any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error.toString() };
  }

  componentDidCatch(error:any, info:any) {
    // You can also log the error to an error reporting service
    console.log(error, info);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Layer
          position='center'
          modal={true}
          margin={{ vertical: 'large', horizontal: 'large' }}
        >
          <Box
            fill
            align="center"
            direction="row"
            gap="large"
            round='xsmall'
            elevation="medium"
            pad={{ vertical: 'large', horizontal: 'large' }}
            background='background'
          >
            <Text color='red'><Error /></Text>
            <Box align="center" direction="row" gap="xsmall">
              <Text> An unrecognised error has occured 😰 It\'s our fault, sorry. </Text>
            </Box>

            <RaisedButton 
              onClick={()=>window.location.reload()}
              label='Please reload the App' 
            />
          </Box>
        </Layer>
      );
    }

    // If there is no error just render the children component.
    return this.props.children;
  }
}
