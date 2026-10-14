import React from 'react';
import styles from '../pages/Plans.module.css';


/*
    Props:
    1) label : points to form field
    2) value : numeric/string value
    3) isUnlimited : Boolean - checks whether the unlimited checkbox is checked.
    4) placeholder: if limited then use placeholder
    5) onValueChange: fn when numeric value changes
    6) onUnlimitedChange: fn when checkbox toggeles.
*/

export function QuotaInput({
    label,
    value,
    isUnlimited,
    placeholder='e.g. 10',
    onValueChange,
    onUnlimitedChange
}){
    return(
        <div className={styles.formGroup}>
            <label className={styles.label}>{label}</label>
            <div className={styles.limitInputRow}>
                <input 
                    type='number'
                    min="1"
                    className={styles.input}
                    placeholder={isUnlimited?
                        'Unlimited':placeholder
                    }
                    value={isUnlimited?'':value}
                    disabled={isUnlimited}
                    onChange={(e)=>onValueChange(e.target.value)}
                />
                <label className={styles.unlimitedCheckLabel}>
                    <input 
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isUnlimited}
                        onChange={(e)=>onUnlimitedChange(e.target.checked)}
                    />
                    Unlimited
                </label>
            </div>
        </div>
    );
}

