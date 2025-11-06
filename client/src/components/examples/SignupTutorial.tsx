import { useState } from 'react';
import SignupTutorial from '../SignupTutorial';
import { Button } from '@/components/ui/button';

export default function SignupTutorialExample() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Show Tutorial</Button>
      <SignupTutorial open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
