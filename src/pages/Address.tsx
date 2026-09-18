import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressForm } from '../components/address/AddressForm';
import { AddressList } from '../components/address/AddressList';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useNavigation } from '../contexts/NavigationContext';

/** Saved addresses come first; the form is a second step behind "add new". */
type Mode = 'list' | 'form';

export function Address() {
  const { t } = useTranslation();
  const { back, screen } = useNavigation();
  const openedOnForm = screen.name === 'address' && screen.intent === 'new';
  const [mode, setMode] = useState<Mode>(openedOnForm ? 'form' : 'list');

  const onBack = mode === 'form' && !openedOnForm ? () => setMode('list') : back;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader
        onBack={onBack}
        kicker={mode === 'form' ? t('address.kicker') : t('address.listKicker')}
        title={mode === 'form' ? t('address.newTitle') : t('address.listTitle')} />
      

      {mode === 'list' ?
      <AddressList onAddNew={() => setMode('form')} /> :

      <AddressForm onSaved={openedOnForm ? back : () => setMode('list')} />
      }
    </div>);

}