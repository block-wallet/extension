import React from 'react';
import { StyleSheetManager } from 'styled-components';

export const StyledComponentsRegistry: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StyleSheetManager enableVendorPrefixes disableCSSOMInjection>
      {children}
    </StyleSheetManager>
  );
};