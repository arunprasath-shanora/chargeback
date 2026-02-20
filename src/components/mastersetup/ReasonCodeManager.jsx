import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Search, Download, Upload } from "lucide-react";

const RC_GROUPINGS = [
  "Authorization","Cancelled Recurring","Cancelled Services","Credit Not Processed",
  "Duplicate Processing","Fraudulent Transaction","Incorrect Amount","Invalid Data",
  "Late Presentment","Not As Described","Others","Paid By Other Means","Pre-Arbitration",
  "Retrieval Request","Services Not Provided","Arbitration"
];
const RC_TYPES = ["Auth","Processing","Fraud","Non Fraud","Compliance"];
const CARD_MANDATES = ["Visa","Mastercard","American Express","Discover","Other"];

const GLOBAL_REASON_CODES = [
  // Mastercard
  { reason_code:"4808", reason_code_description:"Warning Bulletin File", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4808", reason_code_description:"Account Number Not on File", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4808", reason_code_description:"Required Authorization Not Obtained", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4808", reason_code_description:"Expired Chargeback Protection Period", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4808", reason_code_description:"Multiple Authorization Requests", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4808", reason_code_description:"Cardholder-Activated Terminal (CAT) 3 Device", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4834", reason_code_description:"Transaction Amount Differs", reason_code_category:"Point of Interaction Error", reason_code_grouping:"Incorrect Amount", reason_code_type:"Processing", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4834", reason_code_description:"Late Presentment", reason_code_category:"Point of Interaction Error", reason_code_grouping:"Late Presentment", reason_code_type:"Processing", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4834", reason_code_description:"Point-of-Interaction Currency Conversion", reason_code_category:"Point of Interaction Error", reason_code_grouping:"Duplicate Processing", reason_code_type:"Processing", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4834", reason_code_description:"Duplication/Paid by Other Means", reason_code_category:"Point of Interaction Error", reason_code_grouping:"Duplicate Processing", reason_code_type:"Processing", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4834", reason_code_description:"ATM Disputes", reason_code_category:"Point of Interaction Error", reason_code_grouping:"Duplicate Processing", reason_code_type:"Processing", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4834", reason_code_description:"Loss, Theft, or Damages", reason_code_category:"Point of Interaction Error", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4837", reason_code_description:"No Cardholder Authorization", reason_code_category:"No Cardholder Authorization/Fraud-Related Chargebacks", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4849", reason_code_description:"Questionable Merchant Activity", reason_code_category:"No Cardholder Authorization/Fraud-Related Chargebacks", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4870", reason_code_description:"Chip Liability Shift", reason_code_category:"No Cardholder Authorization/Fraud-Related Chargebacks", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4871", reason_code_description:"Chip / PIN Liability Shift--Lost / Stolen /Never Received Issue (NRI) Fraud", reason_code_category:"No Cardholder Authorization/Fraud-Related Chargebacks", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Cardholder Dispute of a Recurring Transaction", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Cancelled Recurring", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Goods or Services Not Provided", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Services Not Provided", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"No-Show Hotel Charge", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Cancelled Recurring", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Addendum Dispute", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Credit Not Processed", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Credit Not Processed", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Goods/Services Not as Described or Defective", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Digital Goods $25 or Less", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Counterfeit Goods", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Transaction Did Not Complete", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4853", reason_code_description:"Credit Posted as a Purchase", reason_code_category:"Cardholder Disputes", reason_code_grouping:"Credit Not Processed", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4850", reason_code_description:"Installment Billing Dispute", reason_code_category:"Installment Billing Dispute", reason_code_grouping:"Retrieval Request", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4854", reason_code_description:"Cardholder Dispute Not Classified Elsewhere (US)", reason_code_category:"Cardholder Dispute Not Classified Elsewhere", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4807", reason_code_description:"Warning Bulletin File", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4812", reason_code_description:"Account Number Not on File", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Others", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4859", reason_code_description:"No Show / Addendum / ATM Dispute", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Paid By Other Means", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  { reason_code:"4860", reason_code_description:"Credit Not Processed", reason_code_category:"Authorization-Related Chargebacks", reason_code_grouping:"Credit Not Processed", reason_code_type:"Auth", card_mandate:"Mastercard", deadline:30 },
  // Visa
  { reason_code:"10.1", reason_code_description:"EMV Liability Shift Counterfeit Fraud", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"10.2", reason_code_description:"EMV Liability Shift Non-Counterfeit Fraud", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"10.3", reason_code_description:"Other Fraud: Card-Present Environment", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"10.4", reason_code_description:"Other Fraud: Card-Absent Environment", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"10.5", reason_code_description:"Visa Fraud Monitoring Program", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"11.1", reason_code_description:"Card Recovery Bulletin", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Visa", deadline:20 },
  { reason_code:"11.2", reason_code_description:"Declined Authorization", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Visa", deadline:20 },
  { reason_code:"11.3", reason_code_description:"No Authorization", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.1", reason_code_description:"Late Presentment", reason_code_category:"Processing Errors", reason_code_grouping:"Late Presentment", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.2", reason_code_description:"Incorrect Transaction Code", reason_code_category:"Processing Errors", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.3", reason_code_description:"Incorrect Currency", reason_code_category:"Processing Errors", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.4", reason_code_description:"Incorrect Account Number", reason_code_category:"Processing Errors", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.5", reason_code_description:"Incorrect Amount", reason_code_category:"Processing Errors", reason_code_grouping:"Incorrect Amount", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.6.1", reason_code_description:"Duplicate Processing", reason_code_category:"Processing Errors", reason_code_grouping:"Duplicate Processing", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.6.2", reason_code_description:"Paid by Other Means", reason_code_category:"Processing Errors", reason_code_grouping:"Paid By Other Means", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"12.7", reason_code_description:"Invalid Data", reason_code_category:"Processing Errors", reason_code_grouping:"Incorrect Amount", reason_code_type:"Processing", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.1", reason_code_description:"Merchandise / Services Not Received", reason_code_category:"Customer Disputes", reason_code_grouping:"Services Not Provided", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.2", reason_code_description:"Canceled Recurring Transaction", reason_code_category:"Customer Disputes", reason_code_grouping:"Cancelled Recurring", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.3", reason_code_description:"Not as Described or Defective Merchandise / Services", reason_code_category:"Customer Disputes", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.4", reason_code_description:"Counterfeit Merchandise", reason_code_category:"Customer Disputes", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.5", reason_code_description:"Misrepresentation", reason_code_category:"Customer Disputes", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.6", reason_code_description:"Credit Not Processed", reason_code_category:"Customer Disputes", reason_code_grouping:"Credit Not Processed", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.7", reason_code_description:"Canceled Merchandise / Services", reason_code_category:"Customer Disputes", reason_code_grouping:"Cancelled Recurring", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.8", reason_code_description:"Original Credit Transaction Not Accepted", reason_code_category:"Customer Disputes", reason_code_grouping:"Credit Not Processed", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  { reason_code:"13.9", reason_code_description:"Non-Receipt of Cash or Load Transaction Value", reason_code_category:"Customer Disputes", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"Visa", deadline:20 },
  // Visa Compliance
  { reason_code:"98", reason_code_description:"Code 98 – Compliance Chargeback", reason_code_category:"Compliance", reason_code_grouping:"Pre-Arbitration", reason_code_type:"Compliance", card_mandate:"Visa", deadline:45 },
  { reason_code:"Pre-Arbitration", reason_code_description:"Pre-Arbitration", reason_code_category:"Pre-Arbitration", reason_code_grouping:"Pre-Arbitration", reason_code_type:"Compliance", card_mandate:"Visa", deadline:45 },
  { reason_code:"Second Chargeback", reason_code_description:"Pre-Arbitration (Second Chargeback)", reason_code_category:"Pre-Arbitration", reason_code_grouping:"Pre-Arbitration", reason_code_type:"Compliance", card_mandate:"Visa", deadline:45 },
  { reason_code:"Arbitration", reason_code_description:"Arbitration", reason_code_category:"Arbitration", reason_code_grouping:"Arbitration", reason_code_type:"Compliance", card_mandate:"Visa", deadline:45 },
  // Mastercard Compliance
  { reason_code:"Pre-Arbitration", reason_code_description:"Pre-Arbitration", reason_code_category:"Pre-Arbitration", reason_code_grouping:"Pre-Arbitration", reason_code_type:"Compliance", card_mandate:"Mastercard", deadline:45 },
  { reason_code:"Second Chargeback", reason_code_description:"Pre-Arbitration (Second Chargeback)", reason_code_category:"Pre-Arbitration", reason_code_grouping:"Pre-Arbitration", reason_code_type:"Compliance", card_mandate:"Mastercard", deadline:45 },
  { reason_code:"Arbitration", reason_code_description:"Arbitration", reason_code_category:"Arbitration", reason_code_grouping:"Arbitration", reason_code_type:"Compliance", card_mandate:"Mastercard", deadline:45 },
  // Discover
  { reason_code:"AA", reason_code_description:"Cardholder Does Not Recognize", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"AP", reason_code_description:"Canceled Recurring Transaction", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Cancelled Recurring", reason_code_type:"Non Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"AW", reason_code_description:"Altered Amount", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Incorrect Amount", reason_code_type:"Processing", card_mandate:"Discover", deadline:30 },
  { reason_code:"CD", reason_code_description:"Credit Posted as Card Sale", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Credit Not Processed", reason_code_type:"Non Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"DP", reason_code_description:"Duplicate Processing", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Duplicate Processing", reason_code_type:"Processing", card_mandate:"Discover", deadline:30 },
  { reason_code:"IC", reason_code_description:"Illegible Sales Data", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"Discover", deadline:30 },
  { reason_code:"NF", reason_code_description:"Non-Receipt of Cash from ATM", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"PM", reason_code_description:"Paid by Other Means", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Paid By Other Means", reason_code_type:"Processing", card_mandate:"Discover", deadline:30 },
  { reason_code:"RG", reason_code_description:"Non-Receipt of Goods or Services", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Services Not Provided", reason_code_type:"Non Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"RM", reason_code_description:"Quality Discrepancy", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"RN2", reason_code_description:"Credit Not Received", reason_code_category:"Cardholder Dispute", reason_code_grouping:"Credit Not Processed", reason_code_type:"Non Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"AT", reason_code_description:"Authorization Non-Compliance", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Discover", deadline:30 },
  { reason_code:"DA", reason_code_description:"Declined Authorization", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Discover", deadline:30 },
  { reason_code:"EX", reason_code_description:"Expired Card", reason_code_category:"Authorization", reason_code_grouping:"Others", reason_code_type:"Auth", card_mandate:"Discover", deadline:30 },
  { reason_code:"NA", reason_code_description:"No Authorization", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"Discover", deadline:30 },
  { reason_code:"IN", reason_code_description:"Invalid Card Number", reason_code_category:"Processing Errors", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"Discover", deadline:30 },
  { reason_code:"LP", reason_code_description:"Late Presentment", reason_code_category:"Processing Errors", reason_code_grouping:"Late Presentment", reason_code_type:"Processing", card_mandate:"Discover", deadline:30 },
  { reason_code:"NC", reason_code_description:"Not Classified", reason_code_category:"Not Classified", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"Discover", deadline:30 },
  { reason_code:"UA01", reason_code_description:"Fraud / Card Present Environment", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"UA02", reason_code_description:"Fraud / Card-Not-Present Environment", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"UA05", reason_code_description:"Fraud / Counterfeit Chip Transaction", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"UA06", reason_code_description:"Fraud / Chip-and-Pin Transaction", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"UA10", reason_code_description:"Request Transaction Receipt (Swiped Card Transactions)", reason_code_category:"Fraud", reason_code_grouping:"Others", reason_code_type:"Fraud", card_mandate:"Discover", deadline:30 },
  { reason_code:"UA11", reason_code_description:"Cardholder Claims Fraud (Swiped Transaction, no Signature)", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"Discover", deadline:30 },
  // American Express
  { reason_code:"A01", reason_code_description:"Charge Amount Exceeds Authorization Amount", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"American Express", deadline:20 },
  { reason_code:"A02", reason_code_description:"No Valid Authorization", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"American Express", deadline:20 },
  { reason_code:"A08", reason_code_description:"Authorization Approval Expired", reason_code_category:"Authorization", reason_code_grouping:"Authorization", reason_code_type:"Auth", card_mandate:"American Express", deadline:20 },
  { reason_code:"C02", reason_code_description:"Credit Not Processed", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Credit Not Processed", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C04", reason_code_description:"Goods / Services Returned Or Refused", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Services Not Provided", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C05", reason_code_description:"Goods / Services Canceled", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Cancelled Recurring", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C08", reason_code_description:"Goods / Services Not Received or Only Partially Received", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Services Not Provided", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C14", reason_code_description:"Paid by Other Means", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Paid By Other Means", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C18", reason_code_description:'"No Show" or CARDeposit Canceled', reason_code_category:"Cardmember Dispute", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C28", reason_code_description:"Canceled Recurring Billing", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Cancelled Recurring", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C31", reason_code_description:"Goods / Services Not as Described", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"C32", reason_code_description:"Goods / Services Damaged or Defective", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Not As Described", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"M10", reason_code_description:"Vehicle Rental - Capital Damages", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Incorrect Amount", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"M49", reason_code_description:"Vehicle Rental - Theft or Loss of Use", reason_code_category:"Cardmember Dispute", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"FR2", reason_code_description:"Fraud Full Recourse Program", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"FR4", reason_code_description:"Immediate Chargeback Program", reason_code_category:"Fraud", reason_code_grouping:"Pre-Arbitration", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"FR6", reason_code_description:"Partial Immediate Chargeback Program", reason_code_category:"Fraud", reason_code_grouping:"Others", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"F10", reason_code_description:"Missing Imprint", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"F14", reason_code_description:"Missing Signature", reason_code_category:"Fraud", reason_code_grouping:"Others", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"F24", reason_code_description:"No Cardmember Authorization", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"F29", reason_code_description:"Card Not Present", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"F30", reason_code_description:"EMV Counterfeit", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"F31", reason_code_description:"EMV List / Stolen / Non-Received", reason_code_category:"Fraud", reason_code_grouping:"Fraudulent Transaction", reason_code_type:"Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"R03", reason_code_description:"Insufficient Reply", reason_code_category:"Inquiry / Miscellaneous", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"R13", reason_code_description:"No Reply", reason_code_category:"Inquiry / Miscellaneous", reason_code_grouping:"Others", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"M01", reason_code_description:"Chargeback Authorization", reason_code_category:"Inquiry / Miscellaneous", reason_code_grouping:"Authorization", reason_code_type:"Non Fraud", card_mandate:"American Express", deadline:20 },
  { reason_code:"P01", reason_code_description:"Unassigned Card Number", reason_code_category:"Processing Errors", reason_code_grouping:"Authorization", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
  { reason_code:"P03", reason_code_description:"Credit Processed as Charge", reason_code_category:"Processing Errors", reason_code_grouping:"Credit Not Processed", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
  { reason_code:"P04", reason_code_description:"Charge Processed as Credit", reason_code_category:"Processing Errors", reason_code_grouping:"Credit Not Processed", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
  { reason_code:"P05", reason_code_description:"Incorrect Charge Amount", reason_code_category:"Processing Errors", reason_code_grouping:"Incorrect Amount", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
  { reason_code:"P07", reason_code_description:"Late Submission", reason_code_category:"Processing Errors", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
  { reason_code:"P08", reason_code_description:"Duplicate Charge", reason_code_category:"Processing Errors", reason_code_grouping:"Duplicate Processing", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
  { reason_code:"P22", reason_code_description:"Non-Matching Card Number", reason_code_category:"Processing Errors", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
  { reason_code:"P23", reason_code_description:"Currency Discrepancy", reason_code_category:"Processing Errors", reason_code_grouping:"Others", reason_code_type:"Processing", card_mandate:"American Express", deadline:20 },
];

const TYPE_COLORS = {
  "Auth":       "bg-blue-50 text-blue-700",
  "Processing": "bg-violet-50 text-violet-700",
  "Fraud":      "bg-red-50 text-red-700",
  "Non Fraud":  "bg-emerald-50 text-emerald-700",
  "Compliance": "bg-amber-50 text-amber-700",
};
const MANDATE_COLORS = {
  "Visa":             "bg-blue-600 text-white",
  "Mastercard":       "bg-orange-500 text-white",
  "American Express": "bg-indigo-600 text-white",
  "Discover":         "bg-orange-400 text-white",
  "Other":            "bg-slate-400 text-white",
};

const EMPTY_FORM = { reason_code: "", reason_code_description: "", reason_code_category: "", reason_code_grouping: "", reason_code_type: "Auth", card_mandate: "Visa", deadline: 20, status: "active" };

export default function ReasonCodeManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [mandateFilter, setMandateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const uploadRef = React.useRef();

  const load = () => base44.entities.ReasonCode.list().then(d => { setRecords(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editId) await base44.entities.ReasonCode.update(editId, form);
    else await base44.entities.ReasonCode.create(form);
    setShowForm(false); setEditId(null); setForm(EMPTY_FORM); load();
  };

  const del = async (id) => { await base44.entities.ReasonCode.delete(id); load(); };
  const edit = (r) => {
    setForm({ reason_code: r.reason_code || "", reason_code_description: r.reason_code_description || "", reason_code_category: r.reason_code_category || "", reason_code_grouping: r.reason_code_grouping || "", reason_code_type: r.reason_code_type || "Auth", card_mandate: r.card_mandate || "Visa", deadline: r.deadline || 20, status: r.status || "active" });
    setEditId(r.id); setShowForm(true);
  };

  const importGlobal = async () => {
    setImporting(true);
    await base44.entities.ReasonCode.bulkCreate(GLOBAL_REASON_CODES.map(r => ({ ...r, status: "active" })));
    setImportMsg(`Imported ${GLOBAL_REASON_CODES.length} reason codes.`);
    load(); setImporting(false);
    setTimeout(() => setImportMsg(""), 4000);
  };

  // Export current records as CSV
  const exportCSV = () => {
    const headers = ["reason_code","reason_code_description","reason_code_category","reason_code_grouping","reason_code_type","card_mandate","deadline","status"];
    const rows = records.map(r => headers.map(h => {
      const val = r[h] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reason_codes.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Upload CSV and upsert records
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
      const parsed = lines.slice(1).map(line => {
        const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, "").trim(); });
        if (obj.deadline) obj.deadline = Number(obj.deadline);
        return obj;
      }).filter(r => r.reason_code);
      if (parsed.length === 0) { setUploadMsg("No valid rows found."); return; }
      setImporting(true);
      await base44.entities.ReasonCode.bulkCreate(parsed);
      setUploadMsg(`Uploaded ${parsed.length} rows successfully.`);
      load(); setImporting(false);
      setTimeout(() => setUploadMsg(""), 5000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.reason_code?.toLowerCase().includes(q) || r.reason_code_description?.toLowerCase().includes(q) || r.reason_code_category?.toLowerCase().includes(q);
    const matchMandate = mandateFilter === "all" || r.card_mandate === mandateFilter;
    const matchType = typeFilter === "all" || r.reason_code_type === typeFilter;
    return matchSearch && matchMandate && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-slate-500">{records.length} reason codes</p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={importGlobal} disabled={importing} className="border-[#0D50B8] text-[#0D50B8] hover:bg-blue-50 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            {importing ? "Importing..." : "Import Global Reason Codes"}
          </Button>
          <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {importMsg && (
        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> {importMsg}
        </p>
      )}

      {/* Form */}
      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Reason Code *</label>
                <Input placeholder="e.g. 4853" value={form.reason_code} onChange={e => setForm(f => ({ ...f, reason_code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Card Mandate</label>
                <Select value={form.card_mandate} onValueChange={v => setForm(f => ({ ...f, card_mandate: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CARD_MANDATES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                <Select value={form.reason_code_type} onValueChange={v => setForm(f => ({ ...f, reason_code_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Deadline (days)</label>
                <Input type="number" placeholder="20" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <Input placeholder="e.g. Credit Not Processed" value={form.reason_code_description} onChange={e => setForm(f => ({ ...f, reason_code_description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
                <Input placeholder="e.g. Customer Disputes" value={form.reason_code_category} onChange={e => setForm(f => ({ ...f, reason_code_category: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Grouping</label>
                <Select value={form.reason_code_grouping} onValueChange={v => setForm(f => ({ ...f, reason_code_grouping: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select grouping..." /></SelectTrigger>
                  <SelectContent>{RC_GROUPINGS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={!form.reason_code} className="bg-[#0D50B8] hover:bg-[#0a3d8f]"><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search reason codes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={mandateFilter} onValueChange={setMandateFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Networks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            {CARD_MANDATES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {RC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Grouping</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Card Mandate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Deadline</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  <p className="font-medium">No reason codes found</p>
                  <p className="text-xs mt-1">Use "Import Global Reason Codes" to load all standard codes.</p>
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{r.reason_code}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[220px]"><span className="line-clamp-2">{r.reason_code_description || "—"}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px]"><span className="line-clamp-2">{r.reason_code_category || "—"}</span></td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{r.reason_code_grouping || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_COLORS[r.reason_code_type] || "bg-slate-100 text-slate-600"}`}>
                      {r.reason_code_type || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${MANDATE_COLORS[r.card_mandate] || "bg-slate-400 text-white"}`}>
                      {r.card_mandate || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{r.deadline ? `${r.deadline} days` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => del(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}