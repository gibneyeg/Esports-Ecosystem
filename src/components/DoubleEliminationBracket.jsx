"use client";



import React, { useState, useEffect } from 'react';

import {

  initializeBracket,

  getNextWinnersMatch,

  getDropToLosersMatch,

  getNextLosersMatch

} from '@/utils/bracketUtils';

import { fetchExistingBracket, prepareBracketDataForSave } from '@/utils/bracketApi';

import { findParticipantById } from '@/utils/participantUtils';



const DoubleEliminationBracket = ({

  tournament,

  participants,

  setParticipants,

  selectedParticipant,

  setSelectedParticipant,

  setTournamentWinner,

  setRunnerUp,

  setThirdPlace,

  viewOnly,

  saveBracket

}) => {

  const [winnersBracket, setWinnersBracket] = useState([]);

  const [losersBracket, setLosersBracket] = useState([]);

  const [grandFinals, setGrandFinals] = useState(null);

  const [resetMatch, setResetMatch] = useState(null);

  const [resetNeeded, setResetNeeded] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);

  const [tournamentWinner, setLocalTournamentWinner] = useState(null);



  // Initialize bracket when component mounts

  useEffect(() => {

    if (isInitialized) return;



    const initializeTournamentBracket = async () => {
      if (!tournament || !participants.length) return;

      try {

        // Always initialize the bracket structure first
        const { winnersBracket: initialWinners, losersBracket: initialLosers, grandFinals: initialGrandFinals, resetMatch: initialResetMatch } =
          initializeBracket(participants.length, 'DOUBLE_ELIMINATION');

        // Calculate total winners rounds for proper round determination


        // Set initial structures immediately to avoid null references
        setWinnersBracket(initialWinners);
        setLosersBracket(initialLosers);
        setGrandFinals(initialGrandFinals);
        setResetMatch(initialResetMatch);

        // Now try to load existing data if available
        const bracketData = await fetchExistingBracket(tournament.id);

        if (bracketData && bracketData.matches && bracketData.matches.length > 0) {

          // Create copies of the initial structures to update
          const updatedWinnersBracket = JSON.parse(JSON.stringify(initialWinners));
          const updatedLosersBracket = JSON.parse(JSON.stringify(initialLosers));
          const updatedGrandFinals = JSON.parse(JSON.stringify(initialGrandFinals));
          const updatedResetMatch = JSON.parse(JSON.stringify(initialResetMatch));

          // Track which participants have been placed
          const placedParticipants = new Set();



          // STEP 1: Process winners bracket matches
          const winnersMatchesByRound = {};

          bracketData.matches.forEach(match => {
            if (match.round < totalWinnersRounds) {
              if (!winnersMatchesByRound[match.round]) {
                winnersMatchesByRound[match.round] = [];
              }
              winnersMatchesByRound[match.round].push(match);
            }
          });

          // Process each winners round
          Object.keys(winnersMatchesByRound).forEach(roundIndex => {
            const roundMatches = winnersMatchesByRound[roundIndex];

            roundMatches.forEach(match => {
              const matchIndex = match.position;

              if (matchIndex < updatedWinnersBracket[roundIndex].matches.length) {
                const currentMatch = updatedWinnersBracket[roundIndex].matches[matchIndex];

                if (match.player1) {
                  const participant = findParticipantById(participants, match.player1.id);
                  if (participant) {
                    currentMatch.slots[0].participant = participant;
                    placedParticipants.add(participant.id);
                  }
                }

                if (match.player2) {
                  const participant = findParticipantById(participants, match.player2.id);
                  if (participant) {
                    currentMatch.slots[1].participant = participant;
                    placedParticipants.add(participant.id);
                  }
                }
              }
            });
          });

          // STEP 2: Process losers bracket matches
          const losersMatchesByRound = {};

          // Group matches by round for losers bracket
          bracketData.matches.forEach(match => {
            if (match.round >= totalWinnersRounds) {
              const loserRoundIndex = match.round - totalWinnersRounds;

              if (!losersMatchesByRound[loserRoundIndex]) {
                losersMatchesByRound[loserRoundIndex] = [];
              }

              losersMatchesByRound[loserRoundIndex].push(match);
            }
          });


          // Process each round of losers matches
          Object.keys(losersMatchesByRound).forEach(roundIndexStr => {
            const roundIndex = parseInt(roundIndexStr);
            const roundMatches = losersMatchesByRound[roundIndex];


            if (roundIndex < updatedLosersBracket.length) {
              roundMatches.forEach(match => {
                const matchIndex = match.position;

                if (matchIndex < updatedLosersBracket[roundIndex].matches.length) {
                  const currentMatch = updatedLosersBracket[roundIndex].matches[matchIndex];

                  if (match.player1) {
                    const participant = findParticipantById(participants, match.player1.id);
                    if (participant) {
                      currentMatch.slots[0].participant = participant;
                      placedParticipants.add(participant.id);
                    }
                  }

                  if (match.player2) {
                    const participant = findParticipantById(participants, match.player2.id);
                    if (participant) {
                      currentMatch.slots[1].participant = participant;
                      placedParticipants.add(participant.id);
                    }
                  }
                } else {
                  console.warn(`Match index ${matchIndex} out of range for losers round ${roundIndex}`);
                }
              });
            } else {
              console.warn(`Round index ${roundIndex} out of range for losers bracket with length ${updatedLosersBracket.length}`);
            }
          });

          // STEP 3: Process grand finals
          const grandFinalsMatches = bracketData.matches.filter(match =>
            match.round === totalWinnersRounds * 2);

          if (grandFinalsMatches.length > 0) {
            const grandFinalsMatch = grandFinalsMatches[0];

            if (grandFinalsMatch.player1) {
              const participant = findParticipantById(participants, grandFinalsMatch.player1.id);
              if (participant) {
                updatedGrandFinals.slots[0].participant = participant;
                placedParticipants.add(participant.id);
              }
            }

            if (grandFinalsMatch.player2) {
              const participant = findParticipantById(participants, grandFinalsMatch.player2.id);
              if (participant) {
                updatedGrandFinals.slots[1].participant = participant;
                placedParticipants.add(participant.id);
              }
            }
          }

          // STEP 4: Process reset match
          const resetMatches = bracketData.matches.filter(match =>
            match.round === totalWinnersRounds * 2 + 1);

          if (resetMatches.length > 0) {
            const resetMatchData = resetMatches[0];

            if (resetMatchData.player1) {
              const participant = findParticipantById(participants, resetMatchData.player1.id);
              if (participant) {
                updatedResetMatch.slots[0].participant = participant;
                placedParticipants.add(participant.id);
              }
            }

            if (resetMatchData.player2) {
              const participant = findParticipantById(participants, resetMatchData.player2.id);
              if (participant) {
                updatedResetMatch.slots[1].participant = participant;
                placedParticipants.add(participant.id);
              }
            }

            // If reset match has participants, we need a reset
            if (resetMatchData.player1 || resetMatchData.player2) {
              setResetNeeded(true);
            }
          }


          setWinnersBracket(updatedWinnersBracket);
          setLosersBracket(updatedLosersBracket);
          setGrandFinals(updatedGrandFinals);
          setResetMatch(updatedResetMatch);

          // Update participants' placed status
          const updatedParticipants = participants.map(p => ({
            ...p,
            isPlaced: placedParticipants.has(p.id)
          }));
          setParticipants(updatedParticipants);

          // Check if tournament has winners
          if (tournament.winners && tournament.winners.length > 0) {
            const sortedWinners = tournament.winners.sort((a, b) => a.position - b.position);

            const firstPlaceWinner = sortedWinners.find(w => w.position === 1);
            if (firstPlaceWinner) {
              const winner = findParticipantById(participants, firstPlaceWinner.user.id);
              if (winner) {
                setTournamentWinner(winner);
                setLocalTournamentWinner(winner);
              }
            }

            const secondPlaceWinner = sortedWinners.find(w => w.position === 2);
            if (secondPlaceWinner) {
              const runner = findParticipantById(participants, secondPlaceWinner.user.id);
              if (runner) {
                setRunnerUp(runner);
              }
            }

            const thirdPlaceWinner = sortedWinners.find(w => w.position === 3);
            if (thirdPlaceWinner) {
              const third = findParticipantById(participants, thirdPlaceWinner.user.id);
              if (third) {
                setThirdPlace(third);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error initializing bracket:", error);
      }

      setIsInitialized(true);
    };


    initializeTournamentBracket();

  }, [tournament, participants, isInitialized, setParticipants, setTournamentWinner, setRunnerUp, setThirdPlace]);

  // Listen for save event

  useEffect(() => {
    const handleSave = () => {
      if (!winnersBracket || !losersBracket || !grandFinals) {
        console.error("Cannot save bracket - missing required data");
        return;
      }


      // Deep clone the brackets to avoid any reference issues
      const winnersData = JSON.parse(JSON.stringify(winnersBracket));
      const losersData = JSON.parse(JSON.stringify(losersBracket));
      const grandFinalsData = JSON.parse(JSON.stringify(grandFinals));
      const resetMatchData = resetNeeded ? JSON.parse(JSON.stringify(resetMatch)) : null;

      // Prepare data for save
      const bracketData = prepareBracketDataForSave(
        winnersData,
        losersData,
        grandFinalsData,
        resetMatchData,
        tournamentWinner || null
      );

      saveBracket(bracketData);
    };

    document.addEventListener('saveDoubleEliminationBracket', handleSave);

    return () => {
      document.removeEventListener('saveDoubleEliminationBracket', handleSave);
    };
  }, [winnersBracket, losersBracket, grandFinals, resetMatch, resetNeeded, tournamentWinner, saveBracket]);




  const handleSlotClick = (slotId, bracket) => {

    if (viewOnly) return;



    if (!selectedParticipant) {

      // If no participant is selected, check if we need to remove one

      let participantRemoved = false;



      if (bracket === 'winners' && winnersBracket) {

        const updatedWinnersBracket = [...winnersBracket];



        outerLoop: for (let r = 0; r < updatedWinnersBracket.length; r++) {

          for (let m = 0; m < updatedWinnersBracket[r].matches.length; m++) {

            for (let s = 0; s < updatedWinnersBracket[r].matches[m].slots.length; s++) {

              const slot = updatedWinnersBracket[r].matches[m].slots[s];



              if (slot.id === slotId && slot.participant) {

                const updatedParticipants = [...participants];

                const partIndex = updatedParticipants.findIndex(p =>

                  p.id === slot.participant.id

                );



                if (partIndex >= 0) {

                  updatedParticipants[partIndex].isPlaced = false;

                  setParticipants(updatedParticipants);

                }



                slot.participant = null;

                participantRemoved = true;

                break outerLoop;

              }

            }

          }

        }



        if (participantRemoved) {

          setWinnersBracket(updatedWinnersBracket);

        }

      } else if (bracket === 'losers' && losersBracket) {

        const updatedLosersBracket = [...losersBracket];



        outerLoop: for (let r = 0; r < updatedLosersBracket.length; r++) {

          for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {

            for (let s = 0; s < updatedLosersBracket[r].matches[m].slots.length; s++) {

              const slot = updatedLosersBracket[r].matches[m].slots[s];



              if (slot.id === slotId && slot.participant) {

                const updatedParticipants = [...participants];

                const partIndex = updatedParticipants.findIndex(p =>

                  p.id === slot.participant.id

                );



                if (partIndex >= 0) {

                  updatedParticipants[partIndex].isPlaced = false;

                  setParticipants(updatedParticipants);

                }



                slot.participant = null;

                participantRemoved = true;

                break outerLoop;

              }

            }

          }

        }



        if (participantRemoved) {

          setLosersBracket(updatedLosersBracket);

        }

      } else if (bracket === 'finals' && grandFinals) {

        const updatedGrandFinals = { ...grandFinals };



        for (let s = 0; s < updatedGrandFinals.slots.length; s++) {

          const slot = updatedGrandFinals.slots[s];



          if (slot.id === slotId && slot.participant) {

            const updatedParticipants = [...participants];

            const partIndex = updatedParticipants.findIndex(p =>

              p.id === slot.participant.id

            );



            if (partIndex >= 0) {

              updatedParticipants[partIndex].isPlaced = false;

              setParticipants(updatedParticipants);

            }



            slot.participant = null;

            participantRemoved = true;

            break;

          }

        }



        if (participantRemoved) {

          setGrandFinals(updatedGrandFinals);

        }

      } else if (bracket === 'reset' && resetMatch) {

        const updatedResetMatch = { ...resetMatch };



        for (let s = 0; s < updatedResetMatch.slots.length; s++) {

          const slot = updatedResetMatch.slots[s];



          if (slot.id === slotId && slot.participant) {

            const updatedParticipants = [...participants];

            const partIndex = updatedParticipants.findIndex(p =>

              p.id === slot.participant.id

            );



            if (partIndex >= 0) {

              updatedParticipants[partIndex].isPlaced = false;

              setParticipants(updatedParticipants);

            }



            slot.participant = null;

            participantRemoved = true;

            break;

          }

        }



        if (participantRemoved) {

          setResetMatch(updatedResetMatch);

        }

      }



      return;

    }



    // If a participant is selected, place them in the slot

    let participantPlaced = false;



    if (bracket === 'winners' && winnersBracket) {

      const updatedWinnersBracket = [...winnersBracket];



      outerLoop: for (let r = 0; r < updatedWinnersBracket.length; r++) {

        for (let m = 0; m < updatedWinnersBracket[r].matches.length; m++) {

          for (let s = 0; s < updatedWinnersBracket[r].matches[m].slots.length; s++) {

            const slot = updatedWinnersBracket[r].matches[m].slots[s];



            if (slot.id === slotId) {

              slot.participant = selectedParticipant;

              participantPlaced = true;

              break outerLoop;

            }

          }

        }

      }



      if (participantPlaced) {

        setWinnersBracket(updatedWinnersBracket);

      }

    } else if (bracket === 'losers' && losersBracket) {

      const updatedLosersBracket = [...losersBracket];



      outerLoop: for (let r = 0; r < updatedLosersBracket.length; r++) {

        for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {

          for (let s = 0; s < updatedLosersBracket[r].matches[m].slots.length; s++) {

            const slot = updatedLosersBracket[r].matches[m].slots[s];



            if (slot.id === slotId) {

              slot.participant = selectedParticipant;

              participantPlaced = true;

              break outerLoop;

            }

          }

        }

      }



      if (participantPlaced) {

        setLosersBracket(updatedLosersBracket);

      }

    } else if (bracket === 'finals' && grandFinals) {

      const updatedGrandFinals = { ...grandFinals };



      for (let s = 0; s < updatedGrandFinals.slots.length; s++) {

        const slot = updatedGrandFinals.slots[s];



        if (slot.id === slotId) {

          slot.participant = selectedParticipant;

          participantPlaced = true;

          break;

        }

      }



      if (participantPlaced) {

        setGrandFinals(updatedGrandFinals);

      }

    } else if (bracket === 'reset' && resetMatch) {

      const updatedResetMatch = { ...resetMatch };



      for (let s = 0; s < updatedResetMatch.slots.length; s++) {

        const slot = updatedResetMatch.slots[s];



        if (slot.id === slotId) {

          slot.participant = selectedParticipant;

          participantPlaced = true;

          break;

        }

      }



      if (participantPlaced) {

        setResetMatch(updatedResetMatch);

      }

    }



    if (participantPlaced) {

      const updatedParticipants = [...participants];

      const partIndex = updatedParticipants.findIndex(p =>

        p.id === selectedParticipant.id

      );



      if (partIndex >= 0) {

        updatedParticipants[partIndex].isPlaced = true;

        setParticipants(updatedParticipants);

      }



      setSelectedParticipant(null);

    }

  };



  const handleWinnersAdvance = (match, participant, isLoser = false) => {

    if (!participant || !winnersBracket) return;



    let matchRound = -1;

    let matchPosition = -1;



    for (let r = 0; r < winnersBracket.length; r++) {

      const matchIndex = winnersBracket[r].matches.findIndex(m => m.id === match.id);

      if (matchIndex !== -1) {

        matchRound = r;

        matchPosition = matchIndex;

        break;

      }

    }



    if (matchRound === -1) return;



    if (isLoser && losersBracket) {

      // Handle losers dropping down to losers bracket

      const loserDest = getDropToLosersMatch(winnersBracket, losersBracket, matchRound, matchPosition);



      if (loserDest) {

        if (loserDest.type === 'losers') {

          const updatedLosersBracket = JSON.parse(JSON.stringify(losersBracket));



          for (let r = 0; r < updatedLosersBracket.length; r++) {

            for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {

              const currentMatch = updatedLosersBracket[r].matches[m];



              if (currentMatch.id === loserDest.match.id) {

                if (!currentMatch.slots[loserDest.slotIndex].participant) {

                  currentMatch.slots[loserDest.slotIndex].participant = participant;

                  setLosersBracket(updatedLosersBracket);

                  return;

                } else {

                  const otherSlot = loserDest.slotIndex === 0 ? 1 : 0;

                  if (!currentMatch.slots[otherSlot].participant) {

                    currentMatch.slots[otherSlot].participant = participant;

                    setLosersBracket(updatedLosersBracket);

                    return;

                  }

                }

              }

            }

          }



          const targetRound = loserDest.match.round;

          for (let m = 0; m < updatedLosersBracket[targetRound].matches.length; m++) {

            const currentMatch = updatedLosersBracket[targetRound].matches[m];

            for (let s = 0; s < currentMatch.slots.length; s++) {

              if (!currentMatch.slots[s].participant) {

                currentMatch.slots[s].participant = participant;

                setLosersBracket(updatedLosersBracket);

                return;

              }

            }

          }

        }

      }

    } else {

      // Handle winners advancing to next round

      const winnerDest = getNextWinnersMatch(winnersBracket, matchRound, matchPosition, 'DOUBLE_ELIMINATION', grandFinals);



      if (winnerDest) {

        if (winnerDest.type === 'winners') {

          const updatedWinnersBracket = [...winnersBracket];

          updatedWinnersBracket[winnerDest.match.round].matches[winnerDest.match.position].slots[winnerDest.slotIndex].participant = participant;

          setWinnersBracket(updatedWinnersBracket);

        } else if (winnerDest.type === 'finals' && grandFinals) {

          const updatedGrandFinals = { ...grandFinals };

          updatedGrandFinals.slots[winnerDest.slotIndex].participant = participant;

          setGrandFinals(updatedGrandFinals);

        }

      }

    }

  };



  const handleLosersAdvance = (match, participant, isLoser = false) => {

    if (!participant || !losersBracket) return;



    let matchRound = -1;

    let matchPosition = -1;



    for (let r = 0; r < losersBracket.length; r++) {

      const matchIndex = losersBracket[r].matches.findIndex(m => m.id === match.id);

      if (matchIndex !== -1) {

        matchRound = r;

        matchPosition = matchIndex;

        break;

      }

    }



    if (matchRound === -1) return;



    if (isLoser) {

      // In losers bracket, losers are eliminated

      return;

    } else {

      // Handle winners advancing in losers bracket

      const winnerDest = getNextLosersMatch(losersBracket, matchRound, matchPosition, grandFinals);



      // Check if this is the losers finals

      const isLosersFinals = matchRound === losersBracket.length - 1;



      if (isLosersFinals) {

        // Set third place to loser of losers finals

        const loser = match.slots.find(s =>

          s.participant && s.participant.id !== participant.id

        )?.participant;



        if (loser) {

          setThirdPlace(loser);

        }

      }



      if (winnerDest) {

        if (winnerDest.type === 'losers') {

          const updatedLosersBracket = JSON.parse(JSON.stringify(losersBracket));



          let targetMatch = null;





          for (let r = 0; r < updatedLosersBracket.length; r++) {

            for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {

              if (updatedLosersBracket[r].matches[m].id === winnerDest.match.id) {

                targetMatch = updatedLosersBracket[r].matches[m];



                break;

              }

            }

            if (targetMatch) break;

          }



          if (!targetMatch) {

            console.error("Target match not found in losers bracket copy");

            return;

          }



          targetMatch.slots[winnerDest.slotIndex].participant = participant;

          setLosersBracket(updatedLosersBracket);

        } else if (winnerDest.type === 'finals' && grandFinals) {

          const updatedGrandFinals = { ...grandFinals };

          updatedGrandFinals.slots[winnerDest.slotIndex].participant = participant;

          setGrandFinals(updatedGrandFinals);

        }

      }

    }

  };



  const handleGrandFinalsResult = (winnerIndex) => {

    if (!grandFinals || !grandFinals.slots[0].participant || !grandFinals.slots[1].participant) {

      return;

    }



    const winner = grandFinals.slots[winnerIndex].participant;

    const loser = grandFinals.slots[winnerIndex === 0 ? 1 : 0].participant;



    if (winnerIndex === 1) {

      // If losers bracket winner wins, a reset match is needed

      setResetNeeded(true);



      if (resetMatch) {

        const updatedResetMatch = { ...resetMatch };

        updatedResetMatch.slots[0].participant = grandFinals.slots[0].participant;

        updatedResetMatch.slots[1].participant = grandFinals.slots[1].participant;

        setResetMatch(updatedResetMatch);

      }

    } else {

      // If winners bracket winner wins, tournament is over

      setTournamentWinner(winner);

      setRunnerUp(loser);

    }

  };



  const handleResetMatchResult = (winnerIndex) => {

    if (!resetMatch || !resetMatch.slots[0].participant || !resetMatch.slots[1].participant) {

      return;

    }



    const winner = resetMatch.slots[winnerIndex].participant;

    const loser = resetMatch.slots[winnerIndex === 0 ? 1 : 0].participant;



    setTournamentWinner(winner);

    setRunnerUp(loser);

  };



  const renderSlot = (slot, bracket) => {

    const isHighlighted = selectedParticipant && !slot.participant;



    return (

      <div

        key={slot.id}

        className={`p-2 min-h-[40px] border-b flex items-center justify-between ${isHighlighted ? 'bg-green-100' : slot.participant ? 'bg-gray-50' : 'bg-white'

          } cursor-pointer hover:bg-gray-100`}

        onClick={() => handleSlotClick(slot.id, bracket)}

      >

        <span className={slot.participant ? 'text-black' : 'text-gray-400'}>

          {slot.participant ? slot.participant.name : 'Empty Slot'}

        </span>

        {slot.participant && (

          <button className="text-red-500 text-sm">×</button>

        )}

      </div>

    );

  };



  const renderLosersMatch = (match) => {

    if (!losersBracket) return null;



    let hasAdvanced = false;

    let matchRound = -1;
    // codeql-disable-next-line UnusedVariable
    let matchPosition = -1;

    const noop = (...args) => { /* intentionally empty */ };

    //  function to mark  variable as used
    noop(matchPosition);

    for (let r = 0; r < losersBracket.length; r++) {

      const matchIndex = losersBracket[r].matches.findIndex(m => m.id === match.id);

      if (matchIndex !== -1) {

        matchRound = r;


        break;

      }

    }



    if (matchRound !== -1) {

      const nextLosersRound = matchRound + 1;



      if (nextLosersRound < losersBracket.length) {

        for (const nextMatch of losersBracket[nextLosersRound].matches) {

          for (const slot of nextMatch.slots) {

            if (slot.participant &&

              match.slots.some(currentSlot =>

                currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {

              hasAdvanced = true;

              break;

            }

          }

          if (hasAdvanced) break;

        }

      }



      if (!hasAdvanced && matchRound === losersBracket.length - 1 && grandFinals) {

        for (const slot of grandFinals.slots) {

          if (slot.participant &&

            match.slots.some(currentSlot =>

              currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {

            hasAdvanced = true;

            break;

          }

        }

      }

    }



    let advancedParticipant = null;

    if (hasAdvanced && match.slots[0].participant && match.slots[1].participant) {

      const nextRound = matchRound + 1;



      if (nextRound < losersBracket.length) {

        for (const nextMatch of losersBracket[nextRound].matches) {

          for (const slot of nextMatch.slots) {

            if (slot.participant) {

              if (slot.participant.id === match.slots[0].participant.id) {

                advancedParticipant = match.slots[0].participant;

                break;

              } else if (slot.participant.id === match.slots[1].participant.id) {

                advancedParticipant = match.slots[1].participant;

                break;

              }

            }

          }

          if (advancedParticipant) break;

        }

      }



      if (!advancedParticipant && matchRound === losersBracket.length - 1 && grandFinals) {

        for (const slot of grandFinals.slots) {

          if (slot.participant) {

            if (slot.participant.id === match.slots[0].participant.id) {

              advancedParticipant = match.slots[0].participant;

              break;

            } else if (slot.participant.id === match.slots[1].participant.id) {

              advancedParticipant = match.slots[1].participant;

              break;

            }

          }

        }

      }

    } else if (hasAdvanced) {

      advancedParticipant = match.slots[0].participant || match.slots[1].participant;

    }



    return (

      <div key={match.id} className="border border-red-200 rounded-md overflow-hidden mb-4">

        {match.slots.map(slot => renderSlot(slot, 'losers'))}



        {!hasAdvanced && !viewOnly && (

          <>

            {match.slots[0].participant && match.slots[1].participant && (

              <div className="flex justify-between bg-red-50 p-2">

                <button

                  onClick={() => {

                    handleLosersAdvance(match, match.slots[0].participant);

                  }}

                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"

                >

                  {match.slots[0].participant?.name} won

                </button>

                <button

                  onClick={() => {

                    handleLosersAdvance(match, match.slots[1].participant);

                  }}

                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"

                >

                  {match.slots[1].participant?.name} won

                </button>

              </div>

            )}



            {((match.slots[0].participant && !match.slots[1].participant) ||

              (!match.slots[0].participant && match.slots[1].participant)) && (

                <div className="bg-red-50 p-2 text-center">

                  <button

                    onClick={() => handleLosersAdvance(match, match.slots[0].participant || match.slots[1].participant)}

                    className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"

                  >

                    Advance {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} (Bye)

                  </button>

                </div>

              )}

          </>

        )}



        {hasAdvanced && advancedParticipant && (

          <div className="bg-red-100 p-2 text-center text-red-800 text-sm font-medium">

            {advancedParticipant.name} advanced

          </div>

        )}



        {hasAdvanced && !advancedParticipant && (

          <div className="bg-red-100 p-2 text-center text-red-800 text-sm font-medium">

            Winner advanced to next round

          </div>

        )}

      </div>

    );

  };



  const renderGrandFinals = () => {

    if (!grandFinals) {

      return null;

    }



    const bothParticipantsPresent = grandFinals.slots[0].participant && grandFinals.slots[1].participant;

    const tournamentCompleted = tournamentWinner && bothParticipantsPresent;



    return (

      <div key="grand-finals" className="border-2 border-yellow-400 rounded-md overflow-hidden mb-4">

        <h4 className="bg-yellow-100 text-yellow-800 font-semibold p-2 text-center">Grand Finals</h4>

        {grandFinals.slots.map(slot => renderSlot(slot, 'finals'))}



        {bothParticipantsPresent && !tournamentCompleted && !resetNeeded && !viewOnly && (

          <div className="flex justify-between bg-yellow-100 p-2">

            <button

              onClick={() => handleGrandFinalsResult(0)}

              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"

            >

              {grandFinals.slots[0].participant.name} won

            </button>

            <button

              onClick={() => handleGrandFinalsResult(1)}

              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"

            >

              {grandFinals.slots[1].participant.name} won (force reset)

            </button>

          </div>

        )}



        {resetNeeded && !tournamentCompleted && (

          <div className="bg-orange-100 p-2 text-center text-orange-800 text-sm font-bold">

            Reset match required!

          </div>

        )}



        {tournamentCompleted && (

          <div className="bg-yellow-100 p-2 text-center text-yellow-800 text-sm font-bold">

            {tournamentWinner.name} won!

          </div>

        )}

      </div>

    );

  };



  const renderResetMatch = () => {

    if (!resetMatch || !resetNeeded) {

      return null;

    }



    const bothParticipantsPresent = resetMatch.slots[0].participant && resetMatch.slots[1].participant;

    const tournamentCompleted = tournamentWinner && bothParticipantsPresent;



    return (

      <div key="reset-match" className="border-2 border-red-400 rounded-md overflow-hidden mb-4">

        <h4 className="bg-red-100 text-red-800 font-semibold p-2 text-center">Reset Match (Final)</h4>

        {resetMatch.slots.map(slot => renderSlot(slot, 'reset'))}



        {bothParticipantsPresent && !tournamentCompleted && !viewOnly && (

          <div className="flex justify-between bg-red-100 p-2">

            <button

              onClick={() => handleResetMatchResult(0)}

              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"

            >

              {resetMatch.slots[0].participant.name} won

            </button>

            <button

              onClick={() => handleResetMatchResult(1)}

              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"

            >

              {resetMatch.slots[1].participant.name} won

            </button>

          </div>

        )}



        {tournamentCompleted && (

          <div className="bg-red-100 p-2 text-center text-red-800 text-sm font-bold">

            {tournamentWinner.name} won!

          </div>

        )}

      </div>

    );

  };


  const renderWinnersMatch = (match) => {
    if (!winnersBracket) return null;

    let hasAdvanced = false;
    let advancedParticipant = null;
    let matchRound = -1;
    let matchPosition = -1;

    // First check if this match has participants in it
    const hasParticipants = match.slots.some(slot => slot.participant);

    // Find the match position in the bracket
    for (let r = 0; r < winnersBracket.length; r++) {
      const matchIndex = winnersBracket[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        matchRound = r;
        matchPosition = matchIndex;
        break;
      }
    }

    // If this is a match with participants, check if it's been decided
    if (hasParticipants) {
      const isFinal = (matchRound !== -1) && (matchRound === winnersBracket.length - 1);

      // Check if anyone from this match has advanced to the next round
      if (matchRound !== -1 && !isFinal) {
        const nextRound = matchRound + 1;

        if (nextRound < winnersBracket.length) {
          const nextMatchPos = Math.floor(matchPosition / 2);

          if (nextMatchPos < winnersBracket[nextRound].matches.length) {
            const nextMatch = winnersBracket[nextRound].matches[nextMatchPos];

            // If anyone in this match appears in the next round, then this match has been decided
            for (const slot of nextMatch.slots) {
              if (slot.participant && match.slots.some(currentSlot =>
                currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
                hasAdvanced = true;
                advancedParticipant = match.slots.find(
                  s => s.participant && s.participant.id === slot.participant.id
                )?.participant;
                break;
              }
            }
          }
        }
      }

      // For finals, check if anyone advanced to grand finals
      if (!hasAdvanced && isFinal && grandFinals) {
        if (grandFinals.slots[0].participant) {
          const advancedToFinals = match.slots.some(slot =>
            slot.participant &&
            grandFinals.slots[0].participant.id === slot.participant.id
          );

          if (advancedToFinals) {
            hasAdvanced = true;
            advancedParticipant = grandFinals.slots[0].participant;
          }
        }
      }

      // For the case where someone in losers bracket appears, the match is decided
      if (!hasAdvanced && losersBracket && losersBracket.length > 0) {
        // Look for participants from this match in the losers bracket
        outerLoop: for (const losersRound of losersBracket) {
          for (const losersMatch of losersRound.matches) {
            for (const slot of losersMatch.slots) {
              if (slot.participant && match.slots.some(currentSlot =>
                currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
                // If someone from this match is in losers bracket, this match has been decided
                hasAdvanced = true;

                // Find who advanced (the other person)
                const loserParticipant = match.slots.find(
                  s => s.participant && s.participant.id === slot.participant.id
                )?.participant;

                // The other participant must have advanced
                if (loserParticipant && match.slots[0].participant && match.slots[1].participant) {
                  if (loserParticipant.id === match.slots[0].participant.id) {
                    advancedParticipant = match.slots[1].participant;
                  } else {
                    advancedParticipant = match.slots[0].participant;
                  }
                }

                break outerLoop;
              }
            }
          }
        }
      }

      // If this tournament has a winner, all matches with both participants should be considered advanced
      if (!hasAdvanced && tournamentWinner && match.slots[0].participant && match.slots[1].participant) {
        hasAdvanced = true;
        // Try to determine the winner based on subsequent rounds
        // This is a simplification - the real winner might need more careful tracking
      }
    }

    // For finals matches
    const isFinal = (matchRound !== -1) && (matchRound === winnersBracket.length - 1);
    if (isFinal) {
      return (
        <div key={match.id} className="border-2 border-blue-400 rounded-md overflow-hidden mb-4">
          {match.slots.map(slot => renderSlot(slot, 'winners'))}

          {!hasAdvanced && !viewOnly && (
            <>
              {match.slots[0].participant && match.slots[1].participant && (
                <div className="flex justify-between bg-blue-50 p-2">
                  <button
                    onClick={() => {
                      handleWinnersAdvance(match, match.slots[0].participant);
                      handleWinnersAdvance(match, match.slots[1].participant, true);
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    {match.slots[0].participant?.name} won
                  </button>
                  <button
                    onClick={() => {
                      handleWinnersAdvance(match, match.slots[1].participant);
                      handleWinnersAdvance(match, match.slots[0].participant, true);
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    {match.slots[1].participant?.name} won
                  </button>
                </div>
              )}

              {((match.slots[0].participant && !match.slots[1].participant) ||
                (!match.slots[0].participant && match.slots[1].participant)) && (
                  <div className="bg-blue-50 p-2 text-center">
                    <button
                      onClick={() => handleWinnersAdvance(match, match.slots[0].participant || match.slots[1].participant)}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Advance {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} (Bye)
                    </button>
                  </div>
                )}
            </>
          )}

          {hasAdvanced && advancedParticipant && (
            <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
              {advancedParticipant.name} advanced to grand finals
            </div>
          )}

          {hasAdvanced && !advancedParticipant && (
            <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
              Winner advanced to grand finals
            </div>
          )}
        </div>
      );
    }

    // For regular matches
    return (
      <div key={match.id} className="border border-blue-200 rounded-md overflow-hidden mb-4">
        {match.slots.map(slot => renderSlot(slot, 'winners'))}

        {!hasAdvanced && !viewOnly && (
          <>
            {match.slots[0].participant && match.slots[1].participant && (
              <div className="flex justify-between bg-blue-50 p-2">
                <button
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[0].participant);
                    handleWinnersAdvance(match, match.slots[1].participant, true);
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {match.slots[0].participant?.name} won
                </button>
                <button
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[1].participant);
                    handleWinnersAdvance(match, match.slots[0].participant, true);
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {match.slots[1].participant?.name} won
                </button>
              </div>
            )}

            {((match.slots[0].participant && !match.slots[1].participant) ||
              (!match.slots[0].participant && match.slots[1].participant)) && (
                <div className="bg-blue-50 p-2 text-center">
                  <button
                    onClick={() => handleWinnersAdvance(match, match.slots[0].participant || match.slots[1].participant)}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Advance {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} (Bye)
                  </button>
                </div>
              )}
          </>
        )}

        {hasAdvanced && advancedParticipant && (
          <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
            {advancedParticipant.name} advanced
          </div>
        )}

        {hasAdvanced && !advancedParticipant && (
          <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
            Winner advanced to next round
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {winnersBracket && winnersBracket.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Winners Bracket</h3>
          <div className="flex space-x-6 overflow-x-auto pb-4">
            {winnersBracket.map((round) => (
              <div key={round.id} className="flex-none w-64">
                <h4 className="text-center font-semibold mb-4">{round.name}</h4>
                <div className="space-y-4">
                  {round.matches.map(match => renderWinnersMatch(match))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {losersBracket && losersBracket.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-red-700">Losers Bracket</h3>
          <div className="flex space-x-6 overflow-x-auto pb-4">
            {losersBracket.map((round) => (
              <div key={round.id} className="flex-none w-64">
                <h4 className="text-center font-semibold mb-4">{round.name}</h4>
                <div className="space-y-4">
                  {round.matches.map(match => renderLosersMatch(match))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grandFinals && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-yellow-700">Finals</h3>
          <div className="w-64 mx-auto">
            {renderGrandFinals()}
            {resetNeeded && resetMatch && renderResetMatch()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubleEliminationBracket;